/**
 * Fetches all repositories for a GitHub user
 */

const GITHUB_API = "https://api.github.com";

export type GitHubUserRepo = {
  owner: string;
  repo: string;
  displayName: string;
};

type GitHubHeaders = {
  Accept: string;
  "X-GitHub-Api-Version": string;
  Authorization?: string;
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

/**
 * Fetches all repositories for a GitHub user/organization
 * Handles pagination to get all repos (max 100 per page)
 */
export const fetchUserRepositories = async (
  owner: string,
  token?: string
): Promise<GitHubUserRepo[]> => {
  const headers = createHeaders(token);
  const repos: GitHubUserRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${GITHUB_API}/users/${owner}/repos?per_page=100&page=${page}&sort=updated&direction=desc&type=all`,
      {
        headers,
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repositories for ${owner}: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
      break;
    }

    // Transform GitHub API response to our format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((repo: any) => {
      repos.push({
        owner: repo.owner.login,
        repo: repo.name,
        displayName: repo.name,
      });
    });

    // Check if there are more pages
    const linkHeader = response.headers.get("link");
    hasMore = linkHeader ? linkHeader.includes('rel="next"') : false;
    page++;
  }

  return repos;
};
