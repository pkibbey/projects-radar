import { NextRequest } from "next/server";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle, GitHubError } from "@/lib/github";
import { generateRepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import db from "@/lib/db";
import { cloneRepoForAnalysis, cleanupRepo } from "@/lib/repo-cloner";
import { analyzeCopilotWithContext, generateQuickCopilotAnalysis } from "@/lib/copilot-analyzer";
import { fetchAndExtractTechStack } from "@/lib/tech-stack-fetcher";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;
  const entry = projectConfig.find(
    (item) => item.owner.toLowerCase() === owner.toLowerCase() && item.repo.toLowerCase() === repo.toLowerCase(),
  );

  if (!entry) {
    return new Response(JSON.stringify({ error: "Repository is not configured." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const cached = await db.getRepoData(owner, repo);
    if (cached) {
      return new Response(JSON.stringify({ ok: true, data: cached, source: "cache" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: null, source: "config" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof GitHubError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;
  const entry = projectConfig.find(
    (item) => item.owner.toLowerCase() === owner.toLowerCase() && item.repo.toLowerCase() === repo.toLowerCase(),
  );

  if (!entry) {
    return new Response(JSON.stringify({ error: "Repository is not configured." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = getGitHubToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN is required to generate data." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user wants to skip Copilot and use LM Studio instead
  const url = new URL(request.url);
  const useLmStudio = url.searchParams.get('useLmStudio') === 'true';
  
  // TEMPORARY: Default to LM Studio until Copilot CLI interactive mode is resolved
  const useCopilot = url.searchParams.get('useCopilot') === 'true';

  let repoPath: string | null = null;

  try {
    const bundle = await fetchRepositoryBundle(entry, token);
    
    let analysis;
    const analysisStartTime = Date.now();
    
    if (!useCopilot || useLmStudio) {
      // Use original LM Studio approach (no cloning needed) - FAST!
      console.log(`Analyzing ${owner}/${repo} with LM Studio...`);
      analysis = await generateRepoAnalysis(bundle);
    } else {
      // Clone repository and analyze with GitHub Copilot CLI
      console.log(`Cloning repository ${owner}/${repo} for Copilot analysis...`);
      repoPath = await cloneRepoForAnalysis(owner, repo, token);
      
      // Try quick analysis first (faster, simpler)
      console.log(`Analyzing ${owner}/${repo} with GitHub Copilot (quick mode)...`);
      
      try {
        analysis = await generateQuickCopilotAnalysis(repoPath, owner, repo);
      } catch (quickError) {
        console.warn('Quick Copilot analysis failed, trying full analysis...', quickError);
        // Fall back to full analysis if quick fails
        analysis = await analyzeCopilotWithContext(repoPath, owner, repo);
      }
    }
    
    // Fetch and extract tech stack from package.json
    console.log(`Extracting tech stack for ${owner}/${repo}...`);
    const techStack = await fetchAndExtractTechStack(
      owner,
      repo,
      entry.branch,
      token
    );
    
    if (techStack) {
      analysis.techStack = techStack;
    }
    
    const analysisDurationMs = Date.now() - analysisStartTime;
    console.log(`Analysis completed in ${analysisDurationMs}ms`);
    
    // Add duration to analysis object
    analysis = { ...analysis, analysisDurationMs };
    
    const record = await db.upsertRepoData(owner, repo, { bundle, analysis });

    return new Response(JSON.stringify({ ok: true, data: record }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Failed to generate data for ${owner}/${repo}.`, error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    // Always cleanup the cloned repository
    if (repoPath) {
      await cleanupRepo(repoPath);
    }
  }
}
