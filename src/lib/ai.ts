import OpenAI from "openai";
import {
  GitHubError,
  RepositoryBundle,
} from "@/lib/github";
import { getAIModel, getLmStudioUrl } from "@/lib/env";
import db from "@/lib/db";

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
    } satisfies RepoAnalysis;

    try {
      await db.upsertRepoData(bundle.meta.owner, bundle.meta.name, { bundle, analysis });
    } catch (error) {
      console.error("persistAnalysis error", error);
    }

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
