import db from "@/lib/db";

export async function POST(request: Request) {
  try {
    // Parse request body (fork filter is sent by client for logging, but we unhide all hidden repos)
    try {
      await request.json();
    } catch (e) {
      // If body parsing fails, that's fine
    }

    // Get all hidden repos
    const hiddenRepos = await db.getHiddenRepos();

    // Unhide each hidden repo
    let unhiddenCount = 0;
    for (const repoKey of hiddenRepos) {
      // Parse the key (format: "owner/repo")
      const [owner, repo] = repoKey.split("/");
      if (owner && repo) {
        await db.unhideRepo(owner, repo);
        unhiddenCount++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Unhid ${unhiddenCount} repositories.`,
        unhiddenCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to unhide all repositories:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
