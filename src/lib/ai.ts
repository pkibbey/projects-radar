import OpenAI from "openai";
import {
  GitHubError,
  RepositoryBundle,
} from "@/lib/github";
import { getAIModel, getLmStudioUrl } from "@/lib/env";
import type { TechStackInfo } from "@/lib/tech-stack-detection";
import { analyzeSourceCodeStructure, formatSourceCodeContext } from "@/lib/source-code-analyzer";

type RepoInsight = {
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
  
  // Build base context from repository metadata
  const baseContext = [
    `Repository: ${meta.owner}/${meta.name}`,
    `Description: ${meta.description ?? "n/a"}`,
    `Primary language: ${meta.primaryLanguage ?? "n/a"}`,
    `Status: ${meta.status}`,
    `Latest push: ${meta.pushedAt}`,
    `Topics: ${meta.topics.join(", ") || "none"}`,
  ];

  // Analyze source code structure if documents are available
  let sourceCodeContext = "";
  if (documents.length > 0) {
    try {
      // Create a map of file contents for analysis
      const filesMap = new Map<string, string>();
      for (const doc of documents) {
        filesMap.set(doc.path, doc.content);
      }

      // Analyze the source code structure
      const analysis = analyzeSourceCodeStructure(filesMap);
      
      // Format and include source code context
      sourceCodeContext = "\n\n## Project Architecture Analysis\n" + formatSourceCodeContext(analysis, meta.name);
      
      // Also include specific important files
      const sourceFiles = documents.filter(d => d.type === 'source').slice(0, 3);
      if (sourceFiles.length > 0) {
        sourceCodeContext += "\n\n## Key Source Files";
        for (const file of sourceFiles) {
          // Include first 200 chars of each key file for context
          const preview = file.content.substring(0, 200).replace(/\n/g, " ");
          sourceCodeContext += `\n- ${file.path}: ${preview}...`;
        }
      }
    } catch (error) {
      console.warn("Failed to analyze source code structure:", error);
    }
  }

  return baseContext.join("\n") + sourceCodeContext;
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

export const buildFallback = (_bundle: RepositoryBundle, summary?: string): RepoAnalysis => ({
  ...FALLBACK_ANALYSIS,
  summary:
    summary ?? FALLBACK_ANALYSIS.summary,
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
    throw new Error(providerHealth.message ?? LM_STUDIO_FAILURE_MESSAGE);
  }

  try {
    const input = `You are an engineering operations co-pilot specializing in source code analysis. 
Analyze the following repository, focusing on the actual source code structure, architecture patterns, 
and implementation details rather than documentation. Respond with JSON using this exact shape:
{
  "summary": string,
  "insights": Array<{"title": string, "description": string}>,
  "actions": Array<{"title": string, "instruction": string}>
}

Guidelines for the summary:
- Write a 1-3 sentence description based on observed code structure and patterns
- Focus on what the code reveals about the project's purpose and architecture
- Include the primary technology stack when evident from the codebase
- Be specific about implementation approach rather than generic

Guidelines for insights (3-5 items):
- Focus on architectural patterns you observe in the code
- Comment on code organization and project structure
- Note technology choices evident in the codebase
- Identify strengths and potential areas of concern from the code
- Avoid assumptions; ground observations in actual code structure

Guidelines for actions (3-5 items):
- Provide actionable next steps based on code analysis
- Suggest improvements to code organization or structure
- Recommend testing or documentation based on what you observe
- Propose technology enhancements based on current stack

Context:
${prepareContext(bundle)}`;

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
      throw new Error(LM_STUDIO_FAILURE_MESSAGE);
    }

    console.error("generateRepoAnalysis error", error);
    if (error instanceof GitHubError) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Generate a very short description of a repository for display
 */
export const generateShortDescription = async (
  bundle: RepositoryBundle,
): Promise<string> => {
  const model = getAIModel();

  const client = new OpenAI({
    apiKey: "lm-studio",
    baseURL: getLmStudioUrl(),
  });

  if (providerHealth.status === "failed") {
    throw new Error(providerHealth.message ?? LM_STUDIO_FAILURE_MESSAGE);
  }

  try {
    const input = `You are an expert at creating concise project descriptions. Analyze this repository and generate a very short description (1-2 sentences maximum, under 120 characters).

Examples of good descriptions:
- A React app based controller for the Adeept RaspTank
- A simple React & Redux boilerplate with a Counter component
- A tracklist exporter for Ableton Live
- An AI Document Analyzer

Respond with ONLY the short description text, no JSON or other formatting.

Repository context:
${prepareContext(bundle)}`;

    const response = await client.responses.create({
      model,
      input,
      max_output_tokens: 100,
    });

    providerHealth = { status: "ready" };
    loggedProviderFailure = false;

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error("AI returned empty response");
    }

    return text;
  } catch (error) {
    if (isConnectionError(error)) {
      providerHealth = {
        status: "failed",
        message: LM_STUDIO_FAILURE_MESSAGE,
      };
      if (!loggedProviderFailure) {
        console.error("generateShortDescription connection error", error);
        loggedProviderFailure = true;
      }
      throw new Error(LM_STUDIO_FAILURE_MESSAGE);
    }

    console.error("generateShortDescription error", error);
    if (error instanceof GitHubError) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Generate a comprehensive README for a repository using AI
 */
export const generateReadmeContent = async (
  bundle: RepositoryBundle,
): Promise<string> => {
  const model = getAIModel();

  const client = new OpenAI({
    apiKey: "lm-studio",
    baseURL: getLmStudioUrl(),
  });

  if (providerHealth.status === "failed") {
    throw new Error(providerHealth.message ?? LM_STUDIO_FAILURE_MESSAGE);
  }

  try {
    const input = `You are an expert technical writer specializing in creating comprehensive README files. Analyze this repository and generate a professional, well-structured README.md file.

The README should include:
1. Clear title and description
2. Features and highlights based on the actual codebase
3. Getting started / installation instructions
4. Usage examples
5. Technology stack
6. Contributing guidelines
7. License information

Format the response as a valid markdown file ready to be committed to GitHub. Make it informative, professional, and specific to the project based on the code analysis.

Repository context:
${prepareContext(bundle)}`;

    const response = await client.responses.create({
      model,
      input,
      max_output_tokens: 2000,
    });

    providerHealth = { status: "ready" };
    loggedProviderFailure = false;

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error("AI returned empty response");
    }

    return text;
  } catch (error) {
    if (isConnectionError(error)) {
      providerHealth = {
        status: "failed",
        message: LM_STUDIO_FAILURE_MESSAGE,
      };
      if (!loggedProviderFailure) {
        console.error("generateReadmeContent connection error", error);
        loggedProviderFailure = true;
      }
      throw new Error(LM_STUDIO_FAILURE_MESSAGE);
    }

    console.error("generateReadmeContent error", error);
    if (error instanceof GitHubError) {
      throw new Error(error.message);
    }
    throw error;
  }
};
