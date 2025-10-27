import { NextRequest } from "next/server";
import { getGitHubToken } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { isForkFilter, type ForkFilter } from "@/lib/fork-filters";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required to generate short descriptions." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
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

    // Fetch all repositories from database
    let allRepos = await db.getFetchedRepositories();
    
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
      name: "repo/generate-batch-short-descriptions",
      data: {
        token,
        forkFilter, // Pass fork filter to Inngest function
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          `Batch short description generation has been queued for ${filteredRepos.length} repositories. Check back in a few moments for results.`,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to queue batch short description generation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
