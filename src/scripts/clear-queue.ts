import { getAllQueues } from "@/lib/bullmq";

/**
 * Clear all tasks from all BullMQ queues
 */
async function clearAllQueues() {
  try {
    console.log("Starting to clear all BullMQ queues...");

    const queues = await getAllQueues();

    for (const queue of queues) {
      console.log(`Clearing queue: ${queue.name}`);
      await queue.clean(0, 0, "completed");
      await queue.clean(0, 0, "failed");
      await queue.clean(0, 0, "active");
      await queue.clean(0, 0, "wait");
      await queue.clean(0, 0, "delayed");
      console.log(`✓ Cleared queue: ${queue.name}`);
    }

    console.log("✓ All queues cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing queues:", error);
    process.exit(1);
  }
}

clearAllQueues();
