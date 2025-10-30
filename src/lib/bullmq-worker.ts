import { Worker } from "bullmq";
import { redisConfig, QUEUE_NAMES, getQueue } from "@/lib/bullmq";
import db from "@/lib/db";
import { fetchRepositoryBundle } from "@/lib/github";
import {
  generateRepoAnalysis,
  generateShortDescription,
  generateReadmeContent,
} from "@/lib/ai";
import { fetchAndExtractTechStack } from "@/lib/tech-stack-fetcher";
import { fetchUserRepositories } from "@/lib/github-user-repos";
import {
  cloneRepoForAnalysis,
  cleanupRepo,
} from "@/lib/repo-cloner";
import {
  analyzeCopilotWithContext,
  generateQuickCopilotAnalysis,
} from "@/lib/copilot-analyzer";
import { generateRepositoryScreenshot } from "@/lib/screenshot-generator";
import type { Job } from "bullmq";

const workerConfig = {
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
  },
};

async function startWorkers() {
  console.log("Starting BullMQ workers...");

  // Worker for processing single repositories
  new Worker(
    QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY,
    async (job: Job) => {
      const { owner, repo, token } = job.data as {
        owner: string;
        repo: string;
        token: string;
      };
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;

      console.log(`[${QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY}] Processing: ${owner}/${repo}`);

      try {
        await db.setRepoStatus(owner, repo, "processing", undefined, "analyze");

        const bundleEntry = { owner, repo } as { owner: string; repo: string };
        const bundle = await fetchRepositoryBundle(bundleEntry, token);
        const analysis = await generateRepoAnalysis(bundle);

        const techStack = await fetchAndExtractTechStack(
          owner,
          repo,
          undefined,
          token
        );

        if (techStack) {
          analysis.techStack = techStack;
        }

        const analysisWithDuration = {
          ...analysis,
          analysisDurationMs: 0,
        };

        await db.upsertRepoData(owner, repo, {
          bundle,
          analysis: analysisWithDuration,
        });

        await db.setRepoStatus(owner, repo, "completed", undefined, "analyze");

        console.log(`[${QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY}] Completed: ${owner}/${repo}`);
        return { success: true, key };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("403")) {
          console.warn(
            `[${QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY}] Skipping ${owner}/${repo}: Access denied`
          );
          await db.setRepoStatus(
            owner,
            repo,
            "completed",
            undefined,
            "analyze"
          );
          return { success: true, key, skipped: true, reason: "Access denied" };
        }

        if (errorMessage.includes("rate limit")) {
          console.error(
            `[${QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY}] Rate limit hit for ${owner}/${repo}`
          );
          await db.setRepoStatus(
            owner,
            repo,
            "failed",
            errorMessage,
            "analyze"
          );
          throw error;
        }

        console.error(
          `[${QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY}] Failed to process ${owner}/${repo}:`,
          error
        );
        await db.setRepoStatus(
          owner,
          repo,
          "failed",
          errorMessage,
          "analyze"
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for batch repository processing
  new Worker(
    QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES,
    async (job: Job) => {
      const { owner, token, forkFilter = "all" } = job.data as {
        owner: string;
        token: string;
        forkFilter?: "all" | "with-forks" | "without-forks";
      };

      console.log(
        `[${QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES}] Starting batch processing for ${owner}`
      );

      try {
        let repos = await fetchUserRepositories(owner, token);

        if (forkFilter === "with-forks") {
          repos = repos.filter((repo) => repo.isFork);
        } else if (forkFilter === "without-forks") {
          repos = repos.filter((repo) => !repo.isFork);
        }

        console.log(
          `[${QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES}] Found ${repos.length} repositories`
        );

        if (repos.length === 0) {
          return { queued: 0, failed: 0 };
        }

        const singleQueue = await getQueue(
          QUEUE_NAMES.PROCESS_SINGLE_REPOSITORY
        );
        const results = await Promise.allSettled(
          repos.map((entry) => {
            return singleQueue.add("process", {
              owner: entry.owner,
              repo: entry.repo,
              token,
            });
          })
        );

        const summary = {
          queued: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };

        console.log(
          `[${QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES}] Batch initiated:`,
          summary
        );
        return summary;
      } catch (error) {
        console.error(
          `[${QUEUE_NAMES.PROCESS_BATCH_REPOSITORIES}] Failed:`,
          error
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for refreshing repository intelligence
  new Worker(
    QUEUE_NAMES.REFRESH_REPOSITORY_INTELLIGENCE,
    async (job: Job) => {
      const { owner, repo, token } = job.data as {
        owner: string;
        repo: string;
        token: string;
      };

      console.log(
        `[${QUEUE_NAMES.REFRESH_REPOSITORY_INTELLIGENCE}] Refreshing: ${owner}/${repo}`
      );

      try {
        await db.setRepoStatus(owner, repo, "processing", undefined, "analyze");

        const bundleEntry = { owner, repo } as { owner: string; repo: string };
        const bundle = await fetchRepositoryBundle(bundleEntry, token);
        const analysis = await generateRepoAnalysis(bundle);

        const techStack = await fetchAndExtractTechStack(
          owner,
          repo,
          undefined,
          token
        );

        if (techStack) {
          analysis.techStack = techStack;
        }

        const analysisWithDuration = {
          ...analysis,
          analysisDurationMs: 0,
        };

        await db.upsertRepoData(owner, repo, {
          bundle,
          analysis: analysisWithDuration,
        });

        await db.setRepoStatus(owner, repo, "completed", undefined, "analyze");

        console.log(
          `[${QUEUE_NAMES.REFRESH_REPOSITORY_INTELLIGENCE}] Completed: ${owner}/${repo}`
        );
        return { success: true, owner, repo };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await db.setRepoStatus(
          owner,
          repo,
          "failed",
          errorMessage,
          "analyze"
        );
        console.error(
          `[${QUEUE_NAMES.REFRESH_REPOSITORY_INTELLIGENCE}] Failed:`,
          error
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for syncing repositories from GitHub
  new Worker(
    QUEUE_NAMES.SYNC_REPOSITORIES_FROM_GITHUB,
    async (job: Job) => {
      const { owner, token } = job.data as {
        owner: string;
        token: string;
      };

      console.log(`[${QUEUE_NAMES.SYNC_REPOSITORIES_FROM_GITHUB}] Syncing: ${owner}`);

      try {
        const repos = await fetchUserRepositories(owner, token);
        await db.saveFetchedRepositories(repos);

        console.log(
          `[${QUEUE_NAMES.SYNC_REPOSITORIES_FROM_GITHUB}] Synced ${repos.length} repositories`
        );
        return { success: true, count: repos.length };
      } catch (error) {
        console.error(
          `[${QUEUE_NAMES.SYNC_REPOSITORIES_FROM_GITHUB}] Failed:`,
          error
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for processing repository data
  new Worker(
    QUEUE_NAMES.PROCESS_REPOSITORY_DATA,
    async (job: Job) => {
      const {
        owner,
        repo,
        token,
        useCopilot = false,
        useLmStudio = true,
      } = job.data as {
        owner: string;
        repo: string;
        token: string;
        useCopilot?: boolean;
        useLmStudio?: boolean;
      };

      console.log(`[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Processing: ${owner}/${repo}`);

      let repoPath: string | null = null;

      try {
        const entry = { owner, repo } as { owner: string; repo: string };
        const bundle = await fetchRepositoryBundle(entry, token);

        let analysis;

        if (!useCopilot || useLmStudio) {
          console.log(
            `[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Using LM Studio for ${owner}/${repo}`
          );
          analysis = await generateRepoAnalysis(bundle);
        } else {
          console.log(
            `[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Cloning ${owner}/${repo} for Copilot`
          );
          repoPath = await cloneRepoForAnalysis(owner, repo, token);

          try {
            analysis = await generateQuickCopilotAnalysis(
              repoPath,
              owner,
              repo
            );
          } catch (quickError) {
            console.warn(
              `[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Quick analysis failed, trying full`
            );
            analysis = await analyzeCopilotWithContext(
              repoPath,
              owner,
              repo
            );
          }
        }

        const techStack = await fetchAndExtractTechStack(
          owner,
          repo,
          undefined,
          token
        );

        if (techStack) {
          analysis.techStack = techStack;
        }

        analysis = { ...analysis, analysisDurationMs: 0 };

        await db.upsertRepoData(owner, repo, { bundle, analysis });

        console.log(`[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Completed: ${owner}/${repo}`);
        return { success: true, owner, repo };
      } catch (error) {
        console.error(
          `[${QUEUE_NAMES.PROCESS_REPOSITORY_DATA}] Failed:`,
          error
        );
        throw error;
      } finally {
        if (repoPath) {
          await cleanupRepo(repoPath);
        }
      }
    },
    workerConfig
  );

  // Worker for generating single short descriptions
  new Worker(
    QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION,
    async (job: Job) => {
      const { owner, repo, token } = job.data as {
        owner: string;
        repo: string;
        token: string;
      };

      console.log(
        `[${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}] Generating for ${owner}/${repo}`
      );

      try {
        await db.setRepoStatus(
          owner,
          repo,
          "processing",
          undefined,
          "short-description"
        );

        const bundleEntry = { owner, repo } as { owner: string; repo: string };
        const bundle = await fetchRepositoryBundle(bundleEntry, token);
        const shortDescription = await generateShortDescription(bundle);

        await db.updateRepoDescription(owner, repo, shortDescription);

        await db.setRepoStatus(
          owner,
          repo,
          "completed",
          undefined,
          "short-description"
        );

        console.log(
          `[${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}] Completed: ${owner}/${repo}`
        );
        return {
          success: true,
          key: `${owner}/${repo}`,
          description: shortDescription,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("403")) {
          console.warn(
            `[${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}] Skipping ${owner}/${repo}: Access denied`
          );
          await db.setRepoStatus(
            owner,
            repo,
            "completed",
            undefined,
            "short-description"
          );
          return {
            success: true,
            key: `${owner}/${repo}`,
            skipped: true,
            reason: "Access denied",
          };
        }

        if (errorMessage.includes("rate limit")) {
          console.error(
            `[${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}] Rate limit hit`
          );
          await db.setRepoStatus(
            owner,
            repo,
            "failed",
            errorMessage,
            "short-description"
          );
          throw error;
        }

        console.error(
          `[${QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION}] Failed:`,
          error
        );
        await db.setRepoStatus(
          owner,
          repo,
          "failed",
          errorMessage,
          "short-description"
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for batch short descriptions
  new Worker(
    QUEUE_NAMES.GENERATE_BATCH_SHORT_DESCRIPTIONS,
    async (job: Job) => {
      const { token, forkFilter = "all" } = job.data as {
        token: string;
        forkFilter?: "all" | "with-forks" | "without-forks";
      };

      console.log(
        `[${QUEUE_NAMES.GENERATE_BATCH_SHORT_DESCRIPTIONS}] Starting batch`
      );

      try {
        let repos = await db.getFetchedRepositories();

        if (forkFilter === "with-forks") {
          repos = repos.filter((repo) => repo.isFork);
        } else if (forkFilter === "without-forks") {
          repos = repos.filter((repo) => !repo.isFork);
        }

        const hiddenRepos = await db.getHiddenRepos();
        const hiddenReposSet = new Set(hiddenRepos);
        repos = repos.filter((repo) => {
          const key = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;
          return !hiddenReposSet.has(key);
        });

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_SHORT_DESCRIPTIONS}] Processing ${repos.length} repos`
        );

        if (repos.length === 0) {
          return { queued: 0, failed: 0 };
        }

        const singleQueue = await getQueue(
          QUEUE_NAMES.GENERATE_SINGLE_SHORT_DESCRIPTION
        );
        const results = await Promise.allSettled(
          repos.map((entry) => {
            return singleQueue.add("generate", {
              owner: entry.owner,
              repo: entry.repo,
              token,
            });
          })
        );

        const summary = {
          queued: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_SHORT_DESCRIPTIONS}] Batch initiated:`,
          summary
        );
        return summary;
      } catch (error) {
        console.error(
          `[${QUEUE_NAMES.GENERATE_BATCH_SHORT_DESCRIPTIONS}] Failed:`,
          error
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for generating single READMEs
  new Worker(
    QUEUE_NAMES.GENERATE_SINGLE_README,
    async (job: Job) => {
      const { owner, repo, token } = job.data as {
        owner: string;
        repo: string;
        token: string;
      };

      console.log(`[${QUEUE_NAMES.GENERATE_SINGLE_README}] Generating: ${owner}/${repo}`);

      try {
        await db.setRepoStatus(owner, repo, "processing", undefined, "readme");

        // Create a temporary entry object for fetchRepositoryBundle
        const bundleEntry = { owner, repo } as { owner: string; repo: string };
        const bundle = await fetchRepositoryBundle(bundleEntry, token);        console.log(`[${QUEUE_NAMES.GENERATE_SINGLE_README}] Analyzing ${owner}/${repo}`);
        const readmeContent = await generateReadmeContent(bundle);

        let sha: string | undefined;
        const existingResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          sha = existingData.sha;
        }

        // Creating commit body with base64 encoded content
        const commitBody: Record<string, unknown> = {
          message: "docs: auto-generate README",
          content: Buffer.from(readmeContent).toString("base64"),
        };

        if (sha) {
          commitBody.sha = sha;
        }

        const commitResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify(commitBody),
          }
        );

        if (!commitResponse.ok) {
          const errorData = await commitResponse.json().catch(() => ({}));
          throw new Error(
            `Failed to create README: ${commitResponse.statusText} - ${JSON.stringify(errorData)}`
          );
        }

        await db.setRepoStatus(owner, repo, "completed", undefined, "readme");

        console.log(`[${QUEUE_NAMES.GENERATE_SINGLE_README}] Completed: ${owner}/${repo}`);
        return { success: true, owner, repo };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("403")) {
          console.warn(
            `[${QUEUE_NAMES.GENERATE_SINGLE_README}] Skipping ${owner}/${repo}: Access denied`
          );
          await db.setRepoStatus(owner, repo, "completed", undefined, "readme");
          return {
            success: true,
            owner,
            repo,
            skipped: true,
            reason: "Access denied",
          };
        }

        if (errorMessage.includes("rate limit")) {
          console.error(
            `[${QUEUE_NAMES.GENERATE_SINGLE_README}] Rate limit hit`
          );
          await db.setRepoStatus(
            owner,
            repo,
            "failed",
            errorMessage,
            "readme"
          );
          throw error;
        }

        console.error(`[${QUEUE_NAMES.GENERATE_SINGLE_README}] Failed:`, error);
        await db.setRepoStatus(
          owner,
          repo,
          "failed",
          errorMessage,
          "readme"
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for batch READMEs
  new Worker(
    QUEUE_NAMES.GENERATE_BATCH_READMES,
    async (job: Job) => {
      const { token, forkFilter = "all" } = job.data as {
        token: string;
        forkFilter?: "all" | "with-forks" | "without-forks";
      };

      console.log(`[${QUEUE_NAMES.GENERATE_BATCH_READMES}] Starting batch`);

      try {
        let repos = await db.getFetchedRepositories();

        if (forkFilter === "with-forks") {
          repos = repos.filter((repo) => repo.isFork);
        } else if (forkFilter === "without-forks") {
          repos = repos.filter((repo) => !repo.isFork);
        }

        const hiddenRepos = await db.getHiddenRepos();
        const hiddenReposSet = new Set(hiddenRepos);
        repos = repos.filter((repo) => {
          const key = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;
          return !hiddenReposSet.has(key);
        });

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_READMES}] Processing ${repos.length} repos`
        );

        if (repos.length === 0) {
          return { queued: 0, failed: 0 };
        }

        const singleQueue = await getQueue(QUEUE_NAMES.GENERATE_SINGLE_README);
        const results = await Promise.allSettled(
          repos.map((entry) => {
            return singleQueue.add("generate", {
              owner: entry.owner,
              repo: entry.repo,
              token,
            });
          })
        );

        const summary = {
          queued: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_READMES}] Batch initiated:`,
          summary
        );
        return summary;
      } catch (error) {
        console.error(`[${QUEUE_NAMES.GENERATE_BATCH_READMES}] Failed:`, error);
        throw error;
      }
    },
    workerConfig
  );

  // Worker for single screenshot generation
  new Worker(
    QUEUE_NAMES.GENERATE_SINGLE_SCREENSHOT,
    async (job: Job) => {
      const { owner, repo, token } = job.data as {
        owner: string;
        repo: string;
        token: string;
      };

      console.log(`[${QUEUE_NAMES.GENERATE_SINGLE_SCREENSHOT}] Processing: ${owner}/${repo}`);

      try {
        await generateRepositoryScreenshot(owner, repo, token);

        console.log(`[${QUEUE_NAMES.GENERATE_SINGLE_SCREENSHOT}] Completed: ${owner}/${repo}`);
        return { success: true, key: `${owner}/${repo}` };
      } catch (error) {
        console.error(
          `[${QUEUE_NAMES.GENERATE_SINGLE_SCREENSHOT}] Failed for ${owner}/${repo}:`,
          error
        );
        throw error;
      }
    },
    workerConfig
  );

  // Worker for batch screenshots
  new Worker(
    QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS,
    async (job: Job) => {
      const { token, forkFilter = "all" } = job.data as {
        token: string;
        forkFilter?: "all" | "with-forks" | "without-forks";
      };

      console.log(
        `[${QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS}] Starting batch`
      );

      try {
        let repos = await db.getFetchedRepositories();

        if (forkFilter === "with-forks") {
          repos = repos.filter((repo) => repo.isFork);
        } else if (forkFilter === "without-forks") {
          repos = repos.filter((repo) => !repo.isFork);
        }

        const hiddenRepos = await db.getHiddenRepos();
        const hiddenReposSet = new Set(hiddenRepos);
        repos = repos.filter((repo) => {
          const key = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;
          return !hiddenReposSet.has(key);
        });

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS}] Processing ${repos.length} repos`
        );

        if (repos.length === 0) {
          return { queued: 0, failed: 0 };
        }

        const singleQueue = await getQueue(QUEUE_NAMES.GENERATE_SINGLE_SCREENSHOT);
        const results = await Promise.allSettled(
          repos.map((entry) => {
            return singleQueue.add("generate", {
              owner: entry.owner,
              repo: entry.repo,
              token,
            });
          })
        );

        const summary = {
          queued: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };

        console.log(
          `[${QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS}] Batch initiated:`,
          summary
        );
        return summary;
      } catch (error) {
        console.error(`[${QUEUE_NAMES.GENERATE_BATCH_SCREENSHOTS}] Failed:`, error);
        throw error;
      }
    },
    workerConfig
  );

  console.log("All workers started successfully!");
}

// Start workers when this module is imported
if (require.main === module) {
  startWorkers().catch((error) => {
    console.error("Failed to start workers:", error);
    process.exit(1);
  });
}

export { startWorkers };
