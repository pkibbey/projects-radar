import { NextResponse } from "next/server";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle } from "@/lib/github";
import { generateRepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: { owner: string; repo: string } },
) {
  const { owner, repo } = params;
  const entry = projectConfig.find(
    (item) => item.owner.toLowerCase() === owner.toLowerCase() && item.repo.toLowerCase() === repo.toLowerCase(),
  );

  if (!entry) {
    return NextResponse.json({ error: "Repository is not configured." }, { status: 404 });
  }

  const token = getGitHubToken();
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is required to regenerate project intelligence." },
      { status: 400 },
    );
  }

  try {
    const bundle = await fetchRepositoryBundle(entry, token);
    await generateRepoAnalysis(bundle, { entry, token });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      `Failed to regenerate intelligence for ${owner}/${repo}.`,
      error,
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
