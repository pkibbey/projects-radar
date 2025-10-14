import { differenceInDays } from "date-fns";
import { DEFAULT_FILES, ProjectConfigEntry } from "@/config/projects";

const GITHUB_API = "https://api.github.com";

export type RepoDocument = {
  path: string;
  content: string;
  url?: string;
  sha?: string;
};

export type RepoStatus = "active" | "maintenance" | "stale" | "archived";

export type RepositoryBundle = {
  meta: {
    owner: string;
    name: string;
    displayName: string;
    description: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    defaultBranch: string;
    branch: string;
    pushedAt: string;
    htmlUrl: string;
    primaryLanguage: string | null;
    status: RepoStatus;
    topics: string[];
    hasDiscussions: boolean;
    watchers: number;
    license: string | null;
    completenessScore?: number;
  };
  documents: RepoDocument[];
};

type GitHubHeaders = {
  Accept: string;
  "X-GitHub-Api-Version": string;
  Authorization?: string;
  "Content-Type"?: string;
};

const createHeaders = (token?: string): GitHubHeaders => {
  const headers: GitHubHeaders = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const decodeBase64 = (value: string) => Buffer.from(value, "base64").toString("utf-8");

const computeStatus = (pushedAt: string, archived: boolean): RepoStatus => {
  if (archived) return "archived";
  const daysSincePush = differenceInDays(new Date(), new Date(pushedAt));
  if (daysSincePush <= 14) return "active";
  if (daysSincePush <= 60) return "maintenance";
  return "stale";
};

const computeCompletenessScore = (
  repoData: { 
    description?: string | null; 
    license?: { name: string } | null; 
    topics?: string[]; 
    stargazers_count: number; 
    pushed_at: string;
  },
  documents: RepoDocument[]
): number => {
  let score = 0;
  const weights = {
    description: 10,
    readme: 20,
    license: 10,
    topics: 10,
    hasProjectFile: 15,
    hasAnalysisFile: 15,
    stars: 10,
    recent_activity: 10,
  };

  // Description exists
  if (repoData.description?.trim()) {
    score += weights.description;
  }

  // README exists
  if (documents.some(doc => doc.path.toLowerCase().includes('readme'))) {
    score += weights.readme;
  }

  // License exists
  if (repoData.license) {
    score += weights.license;
  }

  // Has topics/tags
  if (Array.isArray(repoData.topics) && repoData.topics.length > 0) {
    score += weights.topics;
  }

  // Has project-related files
  if (documents.some(doc => doc.path.includes('PROJECT'))) {
    score += weights.hasProjectFile;
  }

  // Has analysis files
  if (documents.some(doc => doc.path.includes('TODO') || doc.path.includes('ANALYSIS'))) {
    score += weights.hasAnalysisFile;
  }

  // Has community engagement (stars)
  if (repoData.stargazers_count > 0) {
    score += weights.stars;
  }

  // Recent activity
  const daysSincePush = differenceInDays(new Date(), new Date(repoData.pushed_at));
  if (daysSincePush <= 30) {
    score += weights.recent_activity;
  }

  return Math.min(100, Math.round(score));
};

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GitHubError";
  }
}

export const fetchRepositoryBundle = async (
  entry: ProjectConfigEntry,
  token?: string,
): Promise<RepositoryBundle> => {
  const { owner, repo, branch, displayName } = entry;
  const headers = createHeaders(token);

  const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers,
    next: { revalidate: 60 },
  });

  if (!repoResponse.ok) {
    throw new GitHubError(
      `Failed to load ${owner}/${repo}: ${repoResponse.status} ${repoResponse.statusText}`,
      repoResponse.status,
    );
  }

  const repoData = await repoResponse.json();

  const documents: RepoDocument[] = [];
  for (const path of DEFAULT_FILES) {
    const fileResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`,
      {
        headers,
        next: { revalidate: 300 },
      },
    );

    if (!fileResponse.ok) {
      continue;
    }

    const fileData = await fileResponse.json();
    if (fileData.type === "file" && typeof fileData.content === "string") {
      documents.push({
        path,
        content: decodeBase64(fileData.content),
        url: fileData.html_url,
        sha: fileData.sha,
      });
    }
  }

  const completenessScore = computeCompletenessScore(repoData, documents);

  return {
    meta: {
      owner,
      name: repo,
      displayName: displayName ?? repo,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      defaultBranch: repoData.default_branch,
      branch: branch ?? repoData.default_branch,
      pushedAt: repoData.pushed_at,
      htmlUrl: repoData.html_url,
      primaryLanguage: repoData.language,
      status: computeStatus(repoData.pushed_at, repoData.archived),
      topics: Array.isArray(repoData.topics) ? repoData.topics : [],
      hasDiscussions: Boolean(repoData.has_discussions),
      watchers: repoData.subscribers_count ?? 0,
      license: repoData.license?.name ?? null,
      completenessScore,
    },
    documents,
  };
};

type UpsertDocumentParams = {
  entry: ProjectConfigEntry;
  token: string;
  path: string;
  content: string;
  message?: string;
  sha?: string;
};

export const upsertRepositoryDocument = async ({
  entry,
  token,
  path,
  content,
  message,
  sha,
}: UpsertDocumentParams) => {
  const { owner, repo, branch } = entry;
  const headers = createHeaders(token);
  headers["Content-Type"] = "application/json";

  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  console.info("[github] Writing repository document", {
    owner,
    repo,
    path,
    branch: branch ?? "default",
    hasSha: Boolean(sha),
    url,
  });

  const requestBody: Record<string, unknown> = {
    message: message ?? `docs: update ${path}`,
    content: Buffer.from(content, "utf-8").toString("base64"),
  };

  if (branch) {
    requestBody.branch = branch;
  }

  if (sha) {
    requestBody.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    const bodyText = await response.text().catch(() => "<no body>");
    if (response.status === 404 || response.status === 403) {
      detail +=
        ". Confirm that the repository exists, the branch name is correct, and the provided GitHub token includes the 'repo' scope (contents:write).";
    }
    const logPayload = {
      owner,
      repo,
      path,
      branch: branch ?? "default",
      hasSha: Boolean(sha),
      status: response.status,
      statusText: response.statusText,
      url,
      request: {
        message: requestBody.message,
        branch: branch ?? "default",
        hasSha: Boolean(sha),
        contentBytes: Buffer.byteLength(content, "utf-8"),
      },
      responseBody: bodyText,
    };
    console.error("[github] Failed to write repository document", {
      ...logPayload,
    });
    throw new GitHubError(
      `Failed to write ${path}: ${detail} (url: ${url})`,
      response.status,
    );
  }

  return response.json();
};
