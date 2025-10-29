import { inngest } from "@/lib/inngest";
import db from "@/lib/db";
import { fetchRepositoryBundle } from "@/lib/github";
import { generateRepoAnalysis, generateShortDescription } from "@/lib/ai";
import { fetchAndExtractTechStack } from "@/lib/tech-stack-fetcher";
import { fetchUserRepositories } from "@/lib/github-user-repos";
import { cloneRepoForAnalysis, cleanupRepo } from "@/lib/repo-cloner";
import { analyzeCopilotWithContext, generateQuickCopilotAnalysis } from "@/lib/copilot-analyzer";

/**
 * Process a single repository
 */
export const processSingleRepository = inngest.createFunction(
  { id: "process-single-repository" },
  { event: "repo/process-single" },
  async ({ event, logger }) => {
    const { owner, repo, token } = event.data;
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;

    logger.info(`Processing repository: ${owner}/${repo}`);

    try {
      // Mark as processing
      await db.setRepoStatus(owner, repo, "processing");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bundleEntry = { owner, repo } as any;
      const bundle = await fetchRepositoryBundle(bundleEntry, token);
      const analysis = await generateRepoAnalysis(bundle);

      // Fetch and extract tech stack
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

      // Mark as completed
      await db.setRepoStatus(owner, repo, "completed");

      logger.info(`Successfully processed ${owner}/${repo}`);
      return { success: true, key };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if it's a 403 Forbidden error
      if (errorMessage.includes("403")) {
        logger.warn(
          `Skipping ${owner}/${repo}: Access denied (private repository or insufficient permissions)`
        );
        // Mark as completed with skipped status
        await db.setRepoStatus(owner, repo, "completed");
        return { success: true, key, skipped: true, reason: "Access denied" };
      }

      // Check if it's a rate limit error
      if (errorMessage.includes("rate limit")) {
        logger.error(`Rate limit hit for ${owner}/${repo}`);
        await db.setRepoStatus(owner, repo, "failed", errorMessage);
        throw error; // Re-throw to trigger Inngest retry
      }

      logger.error(`Failed to process ${owner}/${repo}:`, error);
      await db.setRepoStatus(owner, repo, "failed", errorMessage);
      throw error; // Re-throw to trigger Inngest retry
    }
  }
);

/**
 * Process all remaining repositories for a user
 */
export const processBatchRepositories = inngest.createFunction(
  { id: "process-batch-repositories" },
  { event: "repo/process-batch" },
  async ({ event, logger }) => {
    const { owner, token, forkFilter = "all" } = event.data;

    logger.info(`Starting batch processing for ${owner} (forkFilter: ${forkFilter})`);

    try {
      let repos = await fetchUserRepositories(owner, token);
      
      // Apply fork filter
      if (forkFilter === "with-forks") {
        repos = repos.filter((repo) => repo.isFork);
      } else if (forkFilter === "without-forks") {
        repos = repos.filter((repo) => !repo.isFork);
      }

      logger.info(`Found ${repos.length} repositories to process`);

      if (repos.length === 0) {
        logger.info("No repositories to process");
        return { queued: 0, failed: 0 };
      }

      // Queue individual repository processing tasks for all filtered repos
      const results = await Promise.allSettled(
        repos.map(async (entry) => {
          return inngest.send({
            name: "repo/process-single",
            data: {
              owner: entry.owner,
              repo: entry.repo,
              token,
            },
          });
        })
      );

      const summary = {
        queued: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };

      logger.info(`Batch processing initiated`, summary);
      return summary;
    } catch (error) {
      logger.error("Failed to start batch processing:", error);
      throw error;
    }
  }
);

/**
 * Refresh repository intelligence (re-analyze)
 */
export const refreshRepositoryIntelligence = inngest.createFunction(
  { id: "refresh-repository-intelligence" },
  { event: "repo/refresh-intelligence" },
  async ({ event, logger }) => {
    const { owner, repo, token } = event.data;

    logger.info(`Refreshing intelligence for ${owner}/${repo}`);

    try {
      // Mark as processing
      await db.setRepoStatus(owner, repo, "processing");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bundleEntry = { owner, repo } as any;
      const bundle = await fetchRepositoryBundle(bundleEntry, token);
      const analysis = await generateRepoAnalysis(bundle);

      // Fetch and extract tech stack
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

      // Mark as completed
      await db.setRepoStatus(owner, repo, "completed");

      logger.info(`Successfully refreshed intelligence for ${owner}/${repo}`);
      return { success: true, owner, repo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db.setRepoStatus(owner, repo, "failed", errorMessage);
      logger.error(`Failed to refresh intelligence for ${owner}/${repo}:`, error);
      throw error;
    }
  }
);

/**
 * Sync repositories from GitHub and initialize status tracking
 */
export const syncRepositoriesFromGitHub = inngest.createFunction(
  { id: "sync-repositories-from-github" },
  { event: "repos/sync" },
  async ({ event, logger }) => {
    const { owner, token } = event.data;

    logger.info(`Syncing repositories for ${owner}`);

    try {
      // Fetch repositories from GitHub
      const repos = await fetchUserRepositories(owner, token);
      console.log('repos: ', repos);

      // Save the fetched repositories list to the database
      await db.saveFetchedRepositories(repos);

      logger.info(`Successfully synced ${repos.length} repositories for ${owner}`);
      return { success: true, count: repos.length };
    } catch (error) {
      logger.error(`Failed to sync repositories for ${owner}:`, error);
      throw error;
    }
  }
);

/**
 * Process repository data - fetch bundle, analyze, and store
 */
export const processRepositoryData = inngest.createFunction(
  { id: "process-repository-data" },
  { event: "repo/process-data" },
  async ({ event, logger }) => {
    const { owner, repo, token, useCopilot = false, useLmStudio = true } = event.data;

    logger.info(`Processing repository data for ${owner}/${repo}`);

    let repoPath: string | null = null;

    try {
      // Create a temporary entry object for fetchRepositoryBundle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = { owner, repo } as any;
      const bundle = await fetchRepositoryBundle(entry, token);

      let analysis;
      
      if (!useCopilot || useLmStudio) {
        // Use original LM Studio approach (no cloning needed) - FAST!
        logger.info(`Analyzing ${owner}/${repo} with LM Studio...`);
        analysis = await generateRepoAnalysis(bundle);
      } else {
        // Clone repository and analyze with GitHub Copilot CLI
        logger.info(`Cloning repository ${owner}/${repo} for Copilot analysis...`);
        repoPath = await cloneRepoForAnalysis(owner, repo, token);
        
        // Try quick analysis first (faster, simpler)
        logger.info(`Analyzing ${owner}/${repo} with GitHub Copilot (quick mode)...`);
        
        try {
          analysis = await generateQuickCopilotAnalysis(repoPath, owner, repo);
        } catch (quickError) {
          logger.warn('Quick Copilot analysis failed, trying full analysis...', quickError);
          // Fall back to full analysis if quick fails
          analysis = await analyzeCopilotWithContext(repoPath, owner, repo);
        }
      }

      // Fetch and extract tech stack from package.json
      logger.info(`Extracting tech stack for ${owner}/${repo}...`);
      const techStack = await fetchAndExtractTechStack(
        owner,
        repo,
        undefined,
        token
      );

      if (techStack) {
        analysis.techStack = techStack;
      }

      // Add duration placeholder
      analysis = { ...analysis, analysisDurationMs: 0 };

      await db.upsertRepoData(owner, repo, { bundle, analysis });

      logger.info(`Successfully processed repository data for ${owner}/${repo}`);
      return { success: true, owner, repo };
    } catch (error) {
      logger.error(`Failed to process repository data for ${owner}/${repo}:`, error);
      throw error;
    } finally {
      // Always cleanup the cloned repository
      if (repoPath) {
        await cleanupRepo(repoPath);
      }
    }
  }
);

/**
 * Generate a short description for a single repository
 */
export const generateSingleShortDescription = inngest.createFunction(
  { id: "generate-single-short-description" },
  { event: "repo/generate-short-description" },
  async ({ event, logger }) => {
    const { owner, repo, token } = event.data;

    logger.info(`Generating short description for ${owner}/${repo}`);

    try {
      // Mark as processing
      await db.setRepoStatus(owner, repo, "processing");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bundleEntry = { owner, repo } as any;
      const bundle = await fetchRepositoryBundle(bundleEntry, token);
      const shortDescription = await generateShortDescription(bundle);

      // Update the description in the database
      await db.updateRepoDescription(owner, repo, shortDescription);

      // Mark as completed
      await db.setRepoStatus(owner, repo, "completed");

      logger.info(`Successfully generated short description for ${owner}/${repo}`, shortDescription);
      return { success: true, key: `${owner}/${repo}`, description: shortDescription };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if it's a 403 Forbidden error
      if (errorMessage.includes("403")) {
        logger.warn(
          `Skipping ${owner}/${repo}: Access denied (private repository or insufficient permissions)`
        );
        // Mark as completed with skipped status
        await db.setRepoStatus(owner, repo, "completed");
        return { success: true, key: `${owner}/${repo}`, skipped: true, reason: "Access denied" };
      }

      // Check if it's a rate limit error
      if (errorMessage.includes("rate limit")) {
        logger.error(`Rate limit hit for ${owner}/${repo}`);
        await db.setRepoStatus(owner, repo, "failed", errorMessage);
        throw error; // Re-throw to trigger Inngest retry
      }

      logger.error(`Failed to generate short description for ${owner}/${repo}:`, error);
      await db.setRepoStatus(owner, repo, "failed", errorMessage);
      throw error; // Re-throw to trigger Inngest retry
    }
  }
);

/**
 * Process all repositories to generate short descriptions
 */
export const generateBatchShortDescriptions = inngest.createFunction(
  { id: "generate-batch-short-descriptions" },
  { event: "repo/generate-batch-short-descriptions" },
  async ({ event, logger }) => {
    const { token, forkFilter = "all" } = event.data;

    logger.info(`Starting batch short description generation (forkFilter: ${forkFilter})`);

    try {
      // Fetch repositories from database
      let repos = await db.getFetchedRepositories();
      
      // Apply fork filter
      if (forkFilter === "with-forks") {
        repos = repos.filter((repo) => repo.isFork);
      } else if (forkFilter === "without-forks") {
        repos = repos.filter((repo) => !repo.isFork);
      }

      logger.info(`Found ${repos.length} repositories to process for short descriptions`);

      if (repos.length === 0) {
        logger.info("No repositories to process");
        return { queued: 0, failed: 0 };
      }

      // Queue individual repository processing tasks for all filtered repos
      const results = await Promise.allSettled(
        repos.map(async (entry) => {
          return inngest.send({
            name: "repo/generate-short-description",
            data: {
              owner: entry.owner,
              repo: entry.repo,
              token,
            },
          });
        })
      );

      const summary = {
        queued: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };

      logger.info(`Batch short description generation initiated`, summary);
      return summary;
    } catch (error) {
      logger.error("Failed to start batch short description generation:", error);
      throw error;
    }
  }
);

/**
 * Generate README for a single repository
 */
export const generateSingleReadme = inngest.createFunction(
  { id: "generate-single-readme" },
  { event: "repo/generate-readme" },
  async ({ event, logger }) => {
    const { owner, repo, token } = event.data;

    logger.info(`Generating README for ${owner}/${repo}`);

    try {
      // Fetch repository details from GitHub
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!repoResponse.ok) {
        throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`);
      }

      const repoData = await repoResponse.json();

      // Generate README content
      const readmeContent = await generateREADMEContent(repoData);

      // Check if README already exists to get its SHA
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

      // Create/update README.md file in the repository
      const commitBody: any = {
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

      logger.info(`Successfully generated README for ${owner}/${repo}`);
      return { success: true, owner, repo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if it's a 403 Forbidden error
      if (errorMessage.includes("403")) {
        logger.warn(
          `Skipping ${owner}/${repo}: Access denied (private repository or insufficient permissions)`
        );
        return { success: true, owner, repo, skipped: true, reason: "Access denied" };
      }

      // Check if it's a rate limit error
      if (errorMessage.includes("rate limit")) {
        logger.error(`Rate limit hit for ${owner}/${repo}`);
        throw error; // Re-throw to trigger Inngest retry
      }

      logger.error(`Failed to generate README for ${owner}/${repo}:`, error);
      throw error; // Re-throw to trigger Inngest retry
    }
  }
);

/**
 * Process all repositories to generate READMEs
 */
export const generateBatchReadmes = inngest.createFunction(
  { id: "generate-batch-readmes" },
  { event: "repo/generate-batch-readmes" },
  async ({ event, logger }) => {
    const { token, forkFilter = "all" } = event.data;

    logger.info(`Starting batch README generation (forkFilter: ${forkFilter})`);

    try {
      // Fetch repositories from database
      let repos = await db.getFetchedRepositories();
      
      // Apply fork filter
      if (forkFilter === "with-forks") {
        repos = repos.filter((repo) => repo.isFork);
      } else if (forkFilter === "without-forks") {
        repos = repos.filter((repo) => !repo.isFork);
      }

      logger.info(`Found ${repos.length} repositories to process for README generation`);

      if (repos.length === 0) {
        logger.info("No repositories to process");
        return { queued: 0, failed: 0 };
      }

      // Queue individual repository processing tasks for all filtered repos
      const results = await Promise.allSettled(
        repos.map(async (entry) => {
          return inngest.send({
            name: "repo/generate-readme",
            data: {
              owner: entry.owner,
              repo: entry.repo,
              token,
            },
          });
        })
      );

      const summary = {
        queued: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };

      logger.info(`Batch README generation initiated`, summary);
      return summary;
    } catch (error) {
      logger.error("Failed to start batch README generation:", error);
      throw error;
    }
  }
);

/**
 * Helper function to generate README content
 */
async function generateREADMEContent(repoData: any): Promise<string> {
  const {
    name,
    description,
    homepage,
    topics = [],
    language,
    clone_url,
    html_url,
    owner,
  } = repoData;

  const hasHomepage = homepage && homepage.trim().length > 0;
  const displayName = name
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const readme = `# ${displayName}

${description || `A GitHub repository for ${name}`}

${hasHomepage ? `🌐 [Visit Project](${homepage})` : ""}

## About

${description || `This project provides functionality for managing and analyzing repository data.`} Whether you're looking to track your repositories, analyze their performance, or generate documentation, this tool is designed to help.

## Features

${
  topics.length > 0
    ? `- 🎯 ${topics.join("\n- 🎯 ")}`
    : `- ✨ Repository management
- 🚀 Automated workflows
- 📊 Data analysis
- 🔧 Easy configuration
- 📝 Comprehensive documentation`
}
${language ? `- 🧠 Built with ${language}` : ""}

## Getting Started

### Prerequisites

- Git
- Node.js (v14 or higher) or your project's required runtime
- Your system's package manager (npm, yarn, pnpm, or bun)

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone ${clone_url}
   cd ${name}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Configure your environment:
   Create a \`.env.local\` file with any required environment variables.

4. Start the development server:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

## Usage

[Add usage examples and instructions here]

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on [GitHub Issues](${html_url}/issues).

---

**Repository:** [${owner.login}/${name}](${html_url})

Generated with ❤️
`;

  return readme;
}
