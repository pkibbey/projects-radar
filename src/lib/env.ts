const throwMissing = (key: string) => {
  throw new Error(`${key} is required but was not provided`);
};

export type AIProvider = "openai" | "lmstudio";

export const getGitHubToken = () => process.env.GITHUB_TOKEN;
export const getOpenAIKey = () => process.env.OPENAI_API_KEY;

export const getAIProvider = (): AIProvider => {
  const value = process.env.AI_PROVIDER?.toLowerCase();
  if (value === "openai") {
    return "openai";
  }
  return "lmstudio";
};

export const getAIModel = (provider: AIProvider) =>
  process.env.AI_MODEL ?? (provider === "openai" ? "gpt-4o-mini" : "lmstudio-community/gemma2:9b-it");

export const getOpenAIBaseUrl = () => process.env.OPENAI_BASE_URL;

export const getLmStudioUrl = () => process.env.LM_STUDIO_URL ?? "http://localhost:1234/v1";

export const requireEnv = (key: string) => process.env[key] ?? throwMissing(key);
