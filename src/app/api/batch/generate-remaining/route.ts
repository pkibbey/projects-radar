import { NextRequest } from "next/server";
import { getGitHubOwner, getGitHubToken } from "@/lib/env";
import { getQueue, QUEUE_NAMES } from "@/lib/bullmq";
import { fetchUserRepositories } from "@/lib/github-user-repos";

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
    console.log(`[Batch Process API] Received request to process repositories for owner: ${owner}`);

    // Parse request body for filters
    try {
      const body = await request.json();
    } catch (e) {
      // If body parsing fails, use defaults
    }

    // Fetch all repositories
    const allRepos = await fetchUserRepositories(owner, token);
    console.log(`[Batch Process API] Fetched ${allRepos.length} total repositories from GitHub`);

    // No filtering applied - processing all repositories
    const filteredRepos = allRepos;

    console.log(`[Batch Process API] After filtering: ${filteredRepos.length} repositories to process`);

    // Queue batch processing job with BullMQ
    const queue = await getQueue(QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES);
    console.log(`[Batch Process API] Got queue instance: ${QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES}`);

    const job = await queue.add("batch", {
      owner,
      token,
    });

    console.log(`[Batch Process API] Successfully queued batch job ID: ${job.id} for ${filteredRepos.length} repositories`);

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          `Batch processing has been queued for ${filteredRepos.length} repositories. Check back in a few moments for results.`,
        jobId: job.id,
        repoCount: filteredRepos.length,
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
