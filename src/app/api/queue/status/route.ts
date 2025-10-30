import { NextRequest } from "next/server";
import { getAllQueues } from "@/lib/bullmq";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queueFilter = searchParams.get("queue") || null;
    const statusFilter = searchParams.get("status") || null;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    console.log(`[Queue Status API] Fetching status with filters - queue: ${queueFilter}, status: ${statusFilter}`);

    const allQueues = await getAllQueues();
    const queueStats: Record<string, any> = {};

    // Get stats for each queue
    for (const queue of allQueues) {
      const queueName = queue.name;
      
      // If queueFilter is specified, skip other queues
      if (queueFilter && queueName !== queueFilter) {
        continue;
      }

      console.log(`[Queue Status API] Processing queue: ${queueName}`);

      try {
        // Get queue counts by status
        const counts = await queue.getJobCounts();
        
        console.log(`[Queue Status API] ${queueName} counts:`, counts);

        const stats = {
          name: queueName,
          counts: {
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            paused: counts.paused || 0,
          },
          jobs: {} as Record<string, any[]>,
        };

        // Fetch jobs by status
        const statusesToFetch = statusFilter ? [statusFilter] : ["waiting", "active", "completed", "failed"];

        for (const status of statusesToFetch) {
          if (status === "waiting") {
            const jobs = await queue.getWaiting(0, limit - 1);
            stats.jobs[status] = jobs.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              attemptsStarted: job.attemptsStarted,
              timestamp: job.timestamp,
            }));
          } else if (status === "active") {
            const jobs = await queue.getActive(0, limit - 1);
            stats.jobs[status] = jobs.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              attemptsStarted: job.attemptsStarted,
              timestamp: job.timestamp,
            }));
          } else if (status === "completed") {
            const jobs = await queue.getCompleted(0, limit - 1);
            stats.jobs[status] = jobs.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              attemptsStarted: job.attemptsStarted,
              timestamp: job.timestamp,
              finishedOn: job.finishedOn,
            }));
          } else if (status === "failed") {
            const jobs = await queue.getFailed(0, limit - 1);
            stats.jobs[status] = jobs.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              attemptsStarted: job.attemptsStarted,
              timestamp: job.timestamp,
              failedReason: job.failedReason,
              finishedOn: job.finishedOn,
            }));
          }
        }

        queueStats[queueName] = stats;
      } catch (error) {
        console.error(`[Queue Status API] Error fetching stats for queue ${queueName}:`, error);
        queueStats[queueName] = {
          name: queueName,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    console.log(`[Queue Status API] Successfully fetched status for ${Object.keys(queueStats).length} queues`);

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        queues: queueStats,
        filters: {
          queue: queueFilter,
          status: statusFilter,
          limit,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Queue Status API] Failed to fetch queue status:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
