import { NextRequest } from "next/server";
import { getGitHubToken } from "@/lib/env";
import db from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { GitHubError } from "@/lib/github";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;

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
  const useCopilot = url.searchParams.get('useCopilot') === 'true';

  try {
    // Queue the data processing with Inngest
    await inngest.send({
      name: "repo/process-data",
      data: {
        owner,
        repo,
        token,
        useCopilot,
        useLmStudio,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Repository data processing has been queued. Check back in a few moments for results.",
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Failed to queue data processing for ${owner}/${repo}.`, error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
