import { getGitHubOwner, getGitHubToken } from "@/lib/env";
import { inngest } from "@/lib/inngest";

export const POST = async () => {
  try {
    const owner = getGitHubOwner();
    const token = getGitHubToken();

    if (!token) {
      return Response.json(
        { error: "GITHUB_TOKEN is not configured" },
        { status: 400 }
      );
    }

    // Queue the sync with Inngest
    await inngest.send({
      name: "repos/sync",
      data: {
        owner,
        token,
      },
    });

    return Response.json(
      {
        ok: true,
        message: "Repository sync has been queued. Check back in a few moments for results.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error queuing repository sync:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync repositories",
      },
      { status: 500 }
    );
  }
};
