import { NextRequest } from "next/server";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle } from "@/lib/github";
import { generateRepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import db from "@/lib/db";

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
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN is required to regenerate project intelligence." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bundle = await fetchRepositoryBundle(entry, token);
    const analysis = await generateRepoAnalysis(bundle);
    const record = await db.upsertRepoData(owner, repo, { bundle, analysis });
    
    return new Response(JSON.stringify({ ok: true, data: record }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      `Failed to regenerate intelligence for ${owner}/${repo}.`,
      error,
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;
  
  try {
    const body = await request.json();
    const { summary } = body;

    if (typeof summary !== "string") {
      return new Response(JSON.stringify({ error: "Summary must be a string." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = await db.updateRepoSummary(owner, repo, summary);

    if (!record) {
      return new Response(JSON.stringify({ error: "Repository data not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: record }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Failed to update summary for ${owner}/${repo}.`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
