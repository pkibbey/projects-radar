import { NextRequest } from "next/server";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle } from "@/lib/github";
import { generateRepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";

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
    await generateRepoAnalysis(bundle, { entry, token });
    return new Response(JSON.stringify({ ok: true }), {
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
