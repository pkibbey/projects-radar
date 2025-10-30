const throwMissing = (key: string) => {
  throw new Error(`${key} is required but was not provided`);
};

export const getGitHubToken = () => process.env.GITHUB_TOKEN;

export const getGitHubOwner = () => requireEnv("GITHUB_OWNER");

export const getAIModel = () => process.env.AI_MODEL ?? "lmstudio-community/gemma2:9b-it";

export const getLmStudioUrl = () => process.env.LM_STUDIO_URL ?? "http://localhost:1234/v1";

const requireEnv = (key: string) => process.env[key] ?? throwMissing(key);
