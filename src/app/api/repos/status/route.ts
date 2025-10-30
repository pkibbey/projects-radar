import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/repos/status
 * Returns the status of all repositories being processed
 * Optionally filter by owner/repo or status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get all repos with any status
    const statuses = await db.getReposByStatuses(["pending", "processing", "completed", "failed"]);
    
    // If owner/repo is specified, filter to that repo
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    
    if (owner && repo) {
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
      const repoStatus = statuses.find(s => s.key === key);
      return NextResponse.json(repoStatus ?? null);
    }
    
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Failed to fetch repo statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository statuses" },
      { status: 500 }
    );
  }
}
