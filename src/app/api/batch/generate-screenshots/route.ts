import { NextRequest } from "next/server";
import { getGitHubToken } from "@/lib/env";
import { getQueue, QUEUE_NAMES } from "@/lib/bullmq";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required to generate screenshots." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body for filters
    try {
      const body = await request.json();
    } catch (e) {
      // If body parsing fails, use defaults
    }

    // Fetch all repositories from database
    let allRepos = await db.getFetchedRepositories();
    console.log(`[Batch Screenshot API] Fetched ${allRepos.length} total repositories from database`);

    // Get hidden repositories
    const hiddenRepos = await db.getHiddenRepos();
    const hiddenReposSet = new Set(hiddenRepos);
    console.log(`[Batch Screenshot API] Found ${hiddenRepos.length} hidden repositories`);

    // Apply filters
    const filteredRepos = allRepos.filter((repo) => {
      const repoKey = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;

      // Filter out hidden repos
      if (hiddenReposSet.has(repoKey)) return false;

      return true;
    });

    console.log(`[Batch Screenshot API] After filtering: ${filteredRepos.length} repositories to process`);

    // Queue batch screenshot generation job with BullMQ
    const queue = await getQueue(QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS);
    console.log(`[Batch Screenshot API] Got queue instance: ${QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS}`);

    const job = await queue.add("batch", {
      token,
    });

    console.log(`[Batch Screenshot API] Successfully queued batch job ID: ${job.id} for ${filteredRepos.length} repositories`);

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          `Batch screenshot generation has been queued for ${filteredRepos.length} repositories. Check back in a few moments for results.`,
        jobId: job.id,
        repoCount: filteredRepos.length,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to queue batch screenshot generation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
