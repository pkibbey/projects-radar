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
 * Fetches all repositories for the authenticated user
 * Handles pagination to get all repos (max 100 per page)
 * 
 * Uses the authenticated /user/repos endpoint when a token is provided,
 * which includes all repositories the user has access to (owned, collaborated, organization repos)
 */
export const fetchUserRepositories = async (
  _owner: string,
  token?: string
): Promise<GitHubUserRepo[]> => {
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to fetch repositories");
  }

  const headers = createHeaders(token);
  const repos: GitHubUserRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page} of repositories for authenticated user...`);
    
    const response = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&type=all`,
      {
        headers,
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch repositories: ${response.status} ${response.statusText}`
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

    // Continue fetching if we got a full page (100 items)
    hasMore = data.length === 100;
    page++;
  }

  console.log(`Total repositories fetched: ${repos.length}`);
  return repos;
};
