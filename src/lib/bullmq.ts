import { Queue } from "bullmq";
import { createClient, type RedisClientType } from "redis";

let redis: RedisClientType;
let redisConnection: RedisClientType;

// Get Redis connection details from environment or use defaults
export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
};

async function getRedisClient(): Promise<RedisClientType> {
  if (!redis) {
    redis = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
      database: redisConfig.db,
    });
    redis.on("error", (err: Error) =>
      console.error("Redis Client Error", err)
    );
    await redis.connect();
  }
  return redis;
}

async function getRedisConnection(): Promise<RedisClientType> {
  if (!redisConnection) {
    redisConnection = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
      database: redisConfig.db,
    });
    redisConnection.on("error", (err: Error) =>
      console.error("Redis Connection Error", err)
    );
    await redisConnection.connect();
  }
  return redisConnection;
}

// Define queue names
export const QUEUE_NAMES = {
  PROCESS_SINGLE_REPOSITORY: "process-single-repository",
  PROCESS_BATCH_REPOSITORIES: "process-batch-repositories",
  REFRESH_REPOSITORY_INTELLIGENCE: "refresh-repository-intelligence",
  SYNC_REPOSITORIES_FROM_GITHUB: "sync-repositories-from-github",
  PROCESS_REPOSITORY_DATA: "process-repository-data",
  GENERATE_SINGLE_SHORT_DESCRIPTION: "generate-single-short-description",
  GENERATE_BATCH_SHORT_DESCRIPTIONS: "generate-batch-short-descriptions",
  GENERATE_SINGLE_README: "generate-single-readme",
  GENERATE_BATCH_READMES: "generate-batch-readmes",
} as const;

// Type definitions for job data
export interface ProcessSingleRepositoryJobData {
  owner: string;
  repo: string;
  token: string;
}

export interface ProcessBatchRepositoriesJobData {
  owner: string;
  token: string;
  forkFilter?: "all" | "with-forks" | "without-forks";
}

export interface RefreshRepositoryIntelligenceJobData {
  owner: string;
  repo: string;
  token: string;
}

export interface SyncRepositoriesFromGitHubJobData {
  owner: string;
  token: string;
}

export interface ProcessRepositoryDataJobData {
  owner: string;
  repo: string;
  token: string;
  useCopilot?: boolean;
  useLmStudio?: boolean;
}

export interface GenerateSingleShortDescriptionJobData {
  owner: string;
  repo: string;
  token: string;
}

export interface GenerateBatchShortDescriptionsJobData {
  token: string;
  forkFilter?: "all" | "with-forks" | "without-forks";
}

export interface GenerateSingleReadmeJobData {
  owner: string;
  repo: string;
  token: string;
}

export interface GenerateBatchReadmesJobData {
  token: string;
  forkFilter?: "all" | "with-forks" | "without-forks";
}

// Queue instances
let queueCache: Map<string, Queue> = new Map();

export async function getQueue(queueName: string): Promise<Queue> {
  if (queueCache.has(queueName)) {
    return queueCache.get(queueName)!;
  }

  const queue = new Queue(queueName, {
    connection: {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  queueCache.set(queueName, queue);
  return queue;
}

// Get all queues for worker
export async function getAllQueues(): Promise<Queue[]> {
  const queues = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueue(name))
  );
  return queues;
}

export { getRedisClient, getRedisConnection };
