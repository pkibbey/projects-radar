import db from "@/lib/db";

export async function GET() {
  try {
    const hiddenRepos = await db.getHiddenRepos();
    
    return new Response(
      JSON.stringify({
        hidden: hiddenRepos,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to get hidden repositories:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
