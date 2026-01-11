"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GitHubUserRepo } from "@/lib/github-user-repos";

type BatchGenerateScreenshotsButtonProps = {
  repos?: GitHubUserRepo[];
};

export const BatchGenerateScreenshotsButton = ({
  repos = [],
}: BatchGenerateScreenshotsButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [filteredCount, setFilteredCount] = useState(0);

  // Calculate which repos match the current filters
  const calculateFilteredCount = useCallback(async () => {
    try {
      // Fetch hidden repos
      const visibilityResponse = await fetch("/api/repos/visibility");

      const visibilityData = await visibilityResponse.json();

      const hiddenReposSet = new Set(visibilityData.hidden || []);

      // Get repos that match all filters
      const reposToProcess = repos.filter((repo) => {
        const repoKey = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;

        // Filter out hidden repos
        if (hiddenReposSet.has(repoKey)) return false;

        return true;
      });
      return reposToProcess.length;
    } catch (e) {
      console.error("Failed to calculate filtered count:", e);
      return 0;
    }
  }, [repos]);

  // Update filtered count when dependencies change
  useEffect(() => {
    calculateFilteredCount().then(setFilteredCount);
  }, [calculateFilteredCount]);

  const handleClick = useCallback(async () => {
    if (status === "loading" || filteredCount === 0) {
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/batch/generate-screenshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      let payload: {
        ok?: boolean;
        message?: string;
        error?: string;
      } = {};

      try {
        payload = await response.json();
      } catch (e) {
        console.error("Failed to parse response JSON:", e, "Status:", response.status, "Text:", await response.text());
      }

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to start batch screenshot generation. Status: ${response.status}`);
      }

      setStatus("success");

      // Refresh after a short delay to allow some processing
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } catch (error) {
      setStatus("error");
      console.error(
        error instanceof Error
          ? error.message
          : "Unable to queue screenshot generation. Check server logs for details."
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }
  }, [status, filteredCount, router]);

  if (filteredCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button
        type="button"
        onClick={handleClick}
        variant="default"
        size="sm"
        disabled={status === "loading" || status === "success"}
        aria-label="Generate screenshots for repositories"
        className="rounded-full cursor-pointer"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {status === "loading"
          ? "Queuing…"
          : status === "success"
            ? ""
            : `Generate ${filteredCount} Screenshot${filteredCount === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
};
