import { NextRequest } from "next/server";
import { getGitHubOwner, getGitHubToken } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { fetchUserRepositories } from "@/lib/github-user-repos";
import { isForkFilter, type ForkFilter } from "@/lib/fork-filters";

export async function POST(request: NextRequest) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required to generate data." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const owner = getGitHubOwner();
    
    // Parse request body for filters
    let forkFilter: ForkFilter = "all";
    
    try {
      const body = await request.json();
      if (isForkFilter(body.forkFilter)) {
        forkFilter = body.forkFilter;
      }
    } catch (e) {
      // If body parsing fails, use defaults
    }

    // Fetch all repositories
    const allRepos = await fetchUserRepositories(owner, token);
    
    // Apply filters
    const filteredRepos = allRepos.filter((repo) => {
      // Apply fork filter
      if (forkFilter === "with-forks") {
        if (!repo.isFork) return false;
      }
      if (forkFilter === "without-forks") {
        if (repo.isFork) return false;
      }
      return true;
    });

    // Send event to Inngest to process batch
    await inngest.send({
      name: "repo/process-batch",
      data: {
        owner,
        token,
        forkFilter, // Pass fork filter to Inngest function
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          `Batch processing has been queued for ${filteredRepos.length} repositories. Check back in a few moments for results.`,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to queue batch processing:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
