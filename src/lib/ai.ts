import OpenAI from "openai";
import { ProjectConfigEntry } from "@/config/projects";
import {
  GitHubError,
  RepositoryBundle,
  upsertRepositoryDocument,
} from "@/lib/github";
import {
  getAIModel,
  getAIProvider,
  getLmStudioUrl,
  getOpenAIBaseUrl,
  getOpenAIKey,
} from "@/lib/env";

export type RepoInsight = {
  title: string;
  description: string;
};

export type RepoAction = {
  title: string;
  instruction: string;
};

export type RepoAnalysis = {
  summary: string;
  insights: RepoInsight[];
  actions: RepoAction[];
};

const INTELLIGENCE_FILENAME = "PROJECT_INTELLIGENCE.md";
const LM_STUDIO_FAILURE_MESSAGE =
  "The dashboard could not connect to the local LM Studio server. Start LM Studio on http://localhost:1234 or update AI configuration.";

type ProviderHealth = {
  status: "unknown" | "ready" | "failed";
  message?: string;
};

let providerHealth: ProviderHealth = { status: "unknown" };
let loggedProviderFailure = false;

const FALLBACK_ANALYSIS: RepoAnalysis = {
  summary:
    "AI insights are unavailable. Configure AI provider settings or ensure the default LM Studio instance is running locally.",
  insights: [
    {
      title: "Missing AI configuration",
      description:
        "Set AI_PROVIDER=lmstudio and run LM Studio on http://localhost:1234 or provide an OPENAI_API_KEY for OpenAI access.",
    },
  ],
  actions: [
    {
      title: "Configure AI access",
      instruction: "Set AI_PROVIDER along with OPENAI_API_KEY or LM_STUDIO_URL to unlock automated insights.",
    },
  ],
};

const prepareContext = (bundle: RepositoryBundle) => {
  const { meta, documents } = bundle;
  const lines: string[] = [
    `Repository: ${meta.owner}/${meta.name}`,
    `Description: ${meta.description ?? "n/a"}`,
    `Primary language: ${meta.primaryLanguage ?? "n/a"}`,
    `Status: ${meta.status}`,
    `Latest push: ${meta.pushedAt}`,
    `Stars: ${meta.stars}, Forks: ${meta.forks}, Watchers: ${meta.watchers}`,
    `Topics: ${meta.topics.join(", ") || "none"}`,
  ];

  for (const doc of documents) {
    const excerpt = doc.content.slice(0, 2000);
    lines.push(`\nFile: ${doc.path}\n${excerpt}`);
  }

  return lines.join("\n");
};

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

export const buildFallback = (bundle: RepositoryBundle, summary?: string): RepoAnalysis => ({
  ...FALLBACK_ANALYSIS,
  summary:
    summary ?? bundle.documents[0]?.content.slice(0, 280) ?? FALLBACK_ANALYSIS.summary,
});

const parseIntelligenceDocument = (content: string): RepoAnalysis | null => {
  try {
    const payload = extractJson(content);
    if (!payload.trim().startsWith("{") && !payload.trim().startsWith("[")) {
      return null;
    }
    const parsed = JSON.parse(payload) as Partial<RepoAnalysis>;

    if (!parsed.summary || !Array.isArray(parsed.insights) || !Array.isArray(parsed.actions)) {
      return null;
    }

    return {
      summary: parsed.summary,
      insights: parsed.insights,
      actions: parsed.actions,
    };
  } catch (error) {
    console.error("parseIntelligenceDocument error", error);
    return null;
  }
};

export const loadCachedRepoAnalysis = (bundle: RepositoryBundle): RepoAnalysis | null => {
  const intelligenceDocument = bundle.documents.find(
    (doc) => doc.path === INTELLIGENCE_FILENAME,
  );

  if (!intelligenceDocument) {
    return null;
  }

  const parsed = parseIntelligenceDocument(intelligenceDocument.content);
  if (parsed) {
    return parsed;
  }

  console.warn(
    `Unable to parse ${INTELLIGENCE_FILENAME} for ${bundle.meta.owner}/${bundle.meta.name}. Skipping regeneration to preserve existing document.`,
  );
  return buildFallback(
    bundle,
    `${INTELLIGENCE_FILENAME} exists but could not be parsed. Update the file manually to refresh insights.`,
  );
};

const buildIntelligenceMarkdown = (bundle: RepositoryBundle, analysis: RepoAnalysis) => {
  const generatedAt = new Date().toISOString();
  const header = `# Project Intelligence for ${bundle.meta.displayName}\n\nGenerated on ${generatedAt}.\n`;
  const summarySection = `\n## Summary\n\n${analysis.summary}\n`;
  const insightsSection =
    analysis.insights.length > 0
      ? `\n## Key Insights\n\n${analysis.insights
          .map((insight) => `- **${insight.title}**: ${insight.description}`)
          .join("\n")}\n`
      : "\n## Key Insights\n\n_No insights available._\n";

  const actionsSection =
    analysis.actions.length > 0
      ? `\n## Suggested Actions\n\n${analysis.actions
          .map((action) => `- **${action.title}**: ${action.instruction}`)
          .join("\n")}\n`
      : "\n## Suggested Actions\n\n_No actions available._\n";

  const jsonBlock = `\n\n\u0060\u0060\u0060json\n${JSON.stringify(analysis, null, 2)}\n\u0060\u0060\u0060\n`;

  return `${header}${summarySection}${insightsSection}${actionsSection}${jsonBlock}`;
};

const isConnectionError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  if (error instanceof AggregateError) {
    return error.errors.some(isConnectionError);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("fetch failed") || message.includes("connection error")) {
      return true;
    }
    if (error.cause) {
      return isConnectionError(error.cause);
    }
  }

  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: string }).code;
    if (code === "ECONNREFUSED") {
      return true;
    }
  }

  return false;
};

export const generateRepoAnalysis = async (
  bundle: RepositoryBundle,
  context?: {
    entry: ProjectConfigEntry;
    token?: string | null;
  },
): Promise<RepoAnalysis> => {
  if (!context?.token) {
    return buildFallback(
      bundle,
      "Set GITHUB_TOKEN with repo scope to generate and persist PROJECT_INTELLIGENCE.md for this repository.",
    );
  }

  const provider = getAIProvider();
  const model = getAIModel(provider);
  const openAIKey = getOpenAIKey();

  if (provider === "openai" && !openAIKey) {
    return buildFallback(
      bundle,
      "AI provider is set to OpenAI but OPENAI_API_KEY is missing. Provide a key or switch AI_PROVIDER to lmstudio.",
    );
  }

  const client = new OpenAI({
    apiKey: provider === "lmstudio" ? openAIKey ?? "lm-studio" : openAIKey!,
    baseURL: provider === "lmstudio" ? getLmStudioUrl() : getOpenAIBaseUrl(),
  });

  if (provider === "lmstudio" && providerHealth.status === "failed") {
    return buildFallback(bundle, providerHealth.message ?? LM_STUDIO_FAILURE_MESSAGE);
  }

  try {
    const input = `You are an engineering operations co-pilot. Analyze the following repository context and respond with JSON using the shape {"summary": string, "insights": Array<{"title": string, "description": string}>, "actions": Array<{"title": string, "instruction": string}>}. Each insight should be concise but actionable. Focus on project health, potential risks, and next steps. Context:\n\n${prepareContext(bundle)}`;

    const response = await client.responses.create({
      model,
      input,
      max_output_tokens: 800,
    });

    providerHealth = { status: "ready" };
    loggedProviderFailure = false;

    const text = response.output_text;
    if (!text) {
      return FALLBACK_ANALYSIS;
    }

    const jsonPayload = extractJson(text);
    const parsed = JSON.parse(jsonPayload) as Partial<RepoAnalysis>;
    const analysis = {
      summary: parsed.summary ?? FALLBACK_ANALYSIS.summary,
      insights: parsed.insights ?? FALLBACK_ANALYSIS.insights,
      actions: parsed.actions ?? FALLBACK_ANALYSIS.actions,
    } satisfies RepoAnalysis;

    if (context?.token) {
      try {
        await upsertRepositoryDocument({
          entry: context.entry,
          token: context.token,
          path: INTELLIGENCE_FILENAME,
          content: buildIntelligenceMarkdown(bundle, analysis),
          message: `docs: update ${INTELLIGENCE_FILENAME}`,
        });
      } catch (error) {
        console.error("persistIntelligence error", error);
      }
    }

    return analysis;
  } catch (error) {
    if (provider === "lmstudio" && isConnectionError(error)) {
      providerHealth = {
        status: "failed",
        message: LM_STUDIO_FAILURE_MESSAGE,
      };
      if (!loggedProviderFailure) {
        console.error("generateRepoAnalysis connection error", error);
        loggedProviderFailure = true;
      }
      return buildFallback(bundle, LM_STUDIO_FAILURE_MESSAGE);
    }

    console.error("generateRepoAnalysis error", error);
    if (error instanceof GitHubError) {
      return buildFallback(bundle, error.message);
    }
    return buildFallback(bundle);
  }
};
