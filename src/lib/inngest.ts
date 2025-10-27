import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "projects-dashboard",
});

// Event types for type safety
export type RepositoryProcessingEvents = {
  "repo/process-single": {
    data: {
      owner: string;
      repo: string;
      token: string;
    };
  };
  "repo/process-batch": {
    data: {
      token: string;
      owner: string;
      forkFilter?: "all" | "with-forks" | "without-forks";
    };
  };
  "repo/refresh-intelligence": {
    data: {
      owner: string;
      repo: string;
      token: string;
    };
  };
  "repos/sync": {
    data: {
      owner: string;
      token: string;
    };
  };
  "repo/process-data": {
    data: {
      owner: string;
      repo: string;
      token: string;
      useCopilot?: boolean;
      useLmStudio?: boolean;
    };
  };
  "repo/generate-short-description": {
    data: {
      owner: string;
      repo: string;
      token: string;
    };
  };
  "repo/generate-batch-short-descriptions": {
    data: {
      token: string;
      forkFilter?: "all" | "with-forks" | "without-forks";
    };
  };
};
