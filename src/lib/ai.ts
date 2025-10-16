import OpenAI from "openai";
import {
  GitHubError,
  RepositoryBundle,
} from "@/lib/github";
import { getAIModel, getLmStudioUrl } from "@/lib/env";
import type { TechStackInfo } from "@/lib/tech-stack-detection";

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
  packages?: string[]; // Main foundational packages (e.g., "Next.js", "Tailwind CSS", "React")
  techStack?: TechStackInfo; // Categorized tech stack extracted from package.json
  analysisDurationMs?: number; // Time taken to analyze the repository in milliseconds
};

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
    "AI insights are unavailable. Start LM Studio locally or point LM_STUDIO_URL at the server you expect to use.",
  insights: [
    {
      title: "Missing AI configuration",
      description:
        "Start LM Studio on http://localhost:1234 or point LM_STUDIO_URL at a running instance.",
    },
  ],
  actions: [
    {
      title: "Configure AI access",
      instruction:
        "Start LM Studio locally or update LM_STUDIO_URL so the dashboard can reach your model server.",
    },
  ],
  packages: [],
};

const prepareContext = (bundle: RepositoryBundle) => {
  const { meta, documents } = bundle;
  const lines: string[] = [
    `Repository: ${meta.owner}/${meta.name}`,
    `Description: ${meta.description ?? "n/a"}`,
    `Primary language: ${meta.primaryLanguage ?? "n/a"}`,
    `Status: ${meta.status}`,
    `Latest push: ${meta.pushedAt}`,
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
): Promise<RepoAnalysis> => {
  const model = getAIModel();

  const client = new OpenAI({
    apiKey: "lm-studio",
    baseURL: getLmStudioUrl(),
  });

  if (providerHealth.status === "failed") {
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
      packages: parsed.packages ?? FALLBACK_ANALYSIS.packages,
    } satisfies RepoAnalysis;

    return analysis;
  } catch (error) {
    if (isConnectionError(error)) {
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

export type PackageJsonEnhancement = {
  description: string;
  keywords: string[];
  homepage?: string;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  author?: string;
};

/**
 * Analyze package.json and generate enhanced metadata using AI
 */
export const enhancePackageJson = async (
  packageJson: Record<string, unknown>,
  repoOwner: string,
  repoName: string,
  readmeContent?: string,
): Promise<PackageJsonEnhancement> => {
  const model = getAIModel();

  const client = new OpenAI({
    apiKey: "lm-studio",
    baseURL: getLmStudioUrl(),
  });

  if (providerHealth.status === "failed") {
    throw new Error(providerHealth.message ?? LM_STUDIO_FAILURE_MESSAGE);
  }

  try {
    const context = `
Repository: ${repoOwner}/${repoName}
Current package.json name: ${packageJson.name || 'unknown'}
Current description: ${packageJson.description || 'none'}
Current keywords: ${JSON.stringify(packageJson.keywords || [])}
Dependencies: ${JSON.stringify(packageJson.dependencies || {})}
DevDependencies: ${JSON.stringify(packageJson.devDependencies || {})}
${readmeContent ? `\nREADME excerpt:\n${readmeContent.slice(0, 1000)}` : ''}
`.trim();

    const input = `You are a package.json metadata expert. Analyze this Node.js project and generate appropriate metadata. Respond with JSON using the shape {"description": string, "keywords": string[], "homepage": string, "repository": {"type": "git", "url": string}, "bugs": {"url": string}, "author": string}. 

Guidelines:
- description: 1-2 sentence project description (max 200 chars), clear and professional
- keywords: 5-15 relevant keywords for npm/package discovery (lowercase, no duplicates)
- homepage: GitHub repository URL (https://github.com/${repoOwner}/${repoName})
- repository: Standard GitHub repository object
- bugs: GitHub issues URL
- author: If not present, can be inferred or set to "${repoOwner}"

Context:
${context}`;

    const response = await client.responses.create({
      model,
      input,
      max_output_tokens: 500,
    });

    providerHealth = { status: "ready" };

    const text = response.output_text;
    if (!text) {
      throw new Error("AI returned empty response");
    }

    const jsonPayload = extractJson(text);
    const parsed = JSON.parse(jsonPayload) as PackageJsonEnhancement;

    // Validate and provide defaults
    return {
      description: parsed.description || `A Node.js project by ${repoOwner}`,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      homepage: parsed.homepage || `https://github.com/${repoOwner}/${repoName}`,
      repository: parsed.repository || {
        type: "git",
        url: `https://github.com/${repoOwner}/${repoName}.git`,
      },
      bugs: parsed.bugs || {
        url: `https://github.com/${repoOwner}/${repoName}/issues`,
      },
      author: parsed.author,
    };
  } catch (error) {
    if (isConnectionError(error)) {
      providerHealth = {
        status: "failed",
        message: LM_STUDIO_FAILURE_MESSAGE,
      };
      console.error("enhancePackageJson connection error", error);
      throw new Error(LM_STUDIO_FAILURE_MESSAGE);
    }

    console.error("enhancePackageJson error", error);
    throw error;
  }
};
