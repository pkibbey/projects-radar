import { NextRequest } from "next/server";
import db from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await context.params;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "hide") {
      await db.hideRepo(owner, repo);
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Repository hidden.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else if (action === "unhide") {
      await db.unhideRepo(owner, repo);
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Repository unhidden.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'hide' or 'unhide'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error(`Failed to update visibility for ${owner}/${repo}.`, error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
