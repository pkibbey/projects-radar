import { NextRequest } from "next/server";
import { getQueue, QUEUE_NAMES } from "@/lib/bullmq";

export async function POST(request: NextRequest) {
  try {
    const { action, queueName, jobId } = await request.json();

    if (!action || !queueName || !jobId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing required fields: action, queueName, jobId",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate queue name
    if (!Object.values(QUEUE_NAMES).includes(queueName)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Invalid queue name: ${queueName}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const queue = await getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Job not found: ${jobId}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let result: any = {};

    switch (action) {
      case "pause":
        await job.changeDelay(-1); // Pause by setting delay to -1
        result = { message: "Job paused successfully" };
        break;

      case "resume":
        await job.changeDelay(0); // Resume by setting delay to 0
        result = { message: "Job resumed successfully" };
        break;

      case "remove":
        await job.remove();
        result = { message: "Job removed successfully" };
        break;

      case "retry":
        await job.retry();
        result = { message: "Job retried successfully" };
        break;

      default:
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Invalid action: ${action}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Queue Jobs API] Error managing job:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
