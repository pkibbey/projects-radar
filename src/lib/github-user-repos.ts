/**
 * Fetches all repositories for a GitHub user
 */

const GITHUB_API = "https://api.github.com";

export type GitHubUserRepo = {
  owner: string;
  repo: string;
  displayName: string;
  isFork: boolean;
  ownerUsername: string;
  isOwnedByUser: boolean; // Always true since we only fetch owned repos
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

// In-memory cache with timestamp to prevent excessive API calls
let cachedRepos: GitHubUserRepo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 3600000; // 1 hour - GitHub rate limit: 5000 requests/hour

/**
 * Fetches all repositories owned by the authenticated GitHub user
 * Handles pagination to get all repos (max 100 per page)
 * 
 * Only returns repositories that are:
 * - Owned by the authenticated user (not forks, not collaborative)
 * 
 * Implements aggressive caching (1 hour) to prevent hitting GitHub's rate limit
 */
export const fetchUserRepositories = async (
  _owner: string,
  token?: string
): Promise<GitHubUserRepo[]> => {
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to fetch repositories");
  }

  // Return cached data if still valid
  const now = Date.now();
  if (cachedRepos !== null && now - cacheTimestamp < CACHE_DURATION_MS) {
    const cached = cachedRepos as GitHubUserRepo[];
    console.log(`Returning cached repositories (${cached.length} repos, cached for ${Math.round((now - cacheTimestamp) / 1000)}s)`);
    return cached;
  }

  const headers = createHeaders(token);
  
  // First, fetch the authenticated user's login
  console.log("Fetching authenticated user information...");
  const userResponse = await fetch(`${GITHUB_API}/user`, { headers });
  if (!userResponse.ok) {
    throw new Error(`Failed to fetch user info: ${userResponse.status}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await userResponse.json() as any;
  const currentUserLogin = user.login;
  console.log(`Authenticated user: ${currentUserLogin}`);

  const repos: GitHubUserRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page} of repositories for authenticated user...`);
    
    // Use type=owner to only get repos owned by the user (excludes forks, collaborative repos)
    const response = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&type=owner`,
      {
        headers,
        next: { revalidate: 3600 }, // Revalidate every 1 hour - aligns with cache duration
      }
    );

    if (!response.ok) {
      // Log detailed error information for debugging
      const errorBody = await response.text();
      console.error('GitHub API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        body: errorBody,
      });
      
      throw new Error(
        `Failed to fetch repositories: ${response.status} ${response.statusText}. Response: ${errorBody}`
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
      const repoOwnerLogin = repo.owner.login;
      repos.push({
        owner: repoOwnerLogin,
        repo: repo.name,
        displayName: repo.name,
        isFork: repo.fork,
        ownerUsername: repoOwnerLogin,
        isOwnedByUser: true, // All repos from type=owner are owned by the user
      });
    });

    // Continue fetching if we got a full page (100 items)
    hasMore = data.length === 100;
    page++;
  }

  console.log(`Total repositories fetched: ${repos.length}`);
  
  // Cache the results
  cachedRepos = repos;
  cacheTimestamp = Date.now();
  
  return repos;
};
