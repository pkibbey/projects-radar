import { NextRequest } from "next/server";
import { getGitHubToken } from "@/lib/env";
import { getQueue, QUEUE_NAMES } from "@/lib/bullmq";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const token = getGitHubToken();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN is required to generate descriptions." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { owner, repo } = await params;

    console.log(`[Short Description API] Received request to queue short description generation for ${owner}/${repo}`);

    // Queue single short description generation job
    const queue = await getQueue(QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION);
    console.log(`[Short Description API] Got queue instance: ${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}`);
    
    const job = await queue.add("generate", {
      owner,
      repo,
      token,
    });

    console.log(`[Short Description API] Successfully queued job ID: ${job.id} for ${owner}/${repo}`);

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Short description generation queued for ${owner}/${repo}.`,
        jobId: job.id,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to queue short description generation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
