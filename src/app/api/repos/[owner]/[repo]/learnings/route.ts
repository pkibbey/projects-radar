import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const learning = await db.getProjectLearning(owner, repo);
    
    if (!learning) {
      return NextResponse.json(
        { error: "Learning data not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(learning);
  } catch (error) {
    console.error("Error fetching learning data:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const body = await request.json();
    
    const learning = await db.upsertProjectLearning(owner, repo, {
      problem: body.problem || null,
      architecture: body.architecture || null,
      keyLearnings: body.keyLearnings || [],
      lessonsForImprovement: body.lessonsForImprovement || [],
      skillsUsed: body.skillsUsed || [],
      timeInvested: body.timeInvested || null,
      statusReason: body.statusReason || null,
    });
    
    return NextResponse.json(learning);
  } catch (error) {
    console.error("Error saving learning data:", error);
    return NextResponse.json(
      { error: "Failed to save learning data" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    await db.deleteProjectLearning(owner, repo);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting learning data:", error);
    return NextResponse.json(
      { error: "Failed to delete learning data" },
      { status: 500 }
    );
  }
}
