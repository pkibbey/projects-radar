import { NextRequest } from "next/server";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle, GitHubError } from "@/lib/github";
import { generateRepoAnalysis, type RepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import db from "@/lib/db";

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

  const token = getGitHubToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN is required to generate data." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bundle = await fetchRepositoryBundle(entry, token);
  let analysis: RepoAnalysis | null = null;
    try {
      analysis = await generateRepoAnalysis(bundle);
    } catch (err) {
      console.error("generateRepoAnalysis error", err);
      analysis = null;
    }

    let record = null;
    if (analysis) {
      record = await db.getRepoData(owner, repo);
    }
    if (!record) {
      record = await db.upsertRepoData(owner, repo, { bundle, analysis });
    }

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
  }
}
