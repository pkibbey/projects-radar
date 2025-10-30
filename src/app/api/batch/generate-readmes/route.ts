import { NextRequest } from "next/server";
import { getGitHubToken } from "@/lib/env";
import { getQueue, QUEUE_NAMES } from "@/lib/bullmq";
import { isForkFilter, type ForkFilter } from "@/lib/fork-filters";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required to generate READMEs." }),
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

    console.log(`[Batch README API] Received request with forkFilter: ${forkFilter}`);

    // Fetch all repositories from database
    let allRepos = await db.getFetchedRepositories();
    console.log(`[Batch README API] Fetched ${allRepos.length} total repositories from database`);

    // Get hidden repositories
    const hiddenRepos = await db.getHiddenRepos();
    const hiddenReposSet = new Set(hiddenRepos);
    console.log(`[Batch README API] Found ${hiddenRepos.length} hidden repositories`);

    // Apply filters
    const filteredRepos = allRepos.filter((repo) => {
      const repoKey = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;

      // Filter out hidden repos
      if (hiddenReposSet.has(repoKey)) return false;

      // Apply fork filter
      if (forkFilter === "with-forks") {
        if (!repo.isFork) return false;
      }
      if (forkFilter === "without-forks") {
        if (repo.isFork) return false;
      }
      return true;
    });

    console.log(`[Batch README API] After filtering: ${filteredRepos.length} repositories to process`);

    // Queue batch README generation job with BullMQ
    const queue = await getQueue(QUEUE_NAMES.GENERATE_BATCH_READMES);
    console.log(`[Batch README API] Got queue instance: ${QUEUE_NAMES.GENERATE_BATCH_READMES}`);
    
    const job = await queue.add("batch", {
      token,
      forkFilter,
    });

    console.log(`[Batch README API] Successfully queued batch job ID: ${job.id} for ${filteredRepos.length} repositories`);

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          `Batch README generation has been queued for ${filteredRepos.length} repositories. Check back in a few moments for results.`,
        jobId: job.id,
        repoCount: filteredRepos.length,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to queue batch README generation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
