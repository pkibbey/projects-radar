"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GitHubUserRepo } from "@/lib/github-user-repos";

type BatchGenerateButtonProps = {
  repos?: GitHubUserRepo[];
};

export const BatchGenerateButton = ({
  repos = [],
}: BatchGenerateButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);

    try {
      const response = await fetch("/api/batch/generate-remaining", {
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
        throw new Error(payload.error ?? `Failed to start batch generation. Status: ${response.status}`);
      }

      setStatus("success");
      setMessage(
        payload.message ??
        `Queued ${filteredCount} repositories for background processing. Check back in a few moments!`
      );

      // Refresh after a short delay to allow some processing
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to queue batch generation. Check server logs for details."
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 5000);
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
        disabled={status === "loading"}
        aria-label="Generate summaries for remaining repositories"
        className="rounded-full cursor-pointer"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {status === "loading"
          ? "Queuing…"
          : `Generate ${filteredCount} Summar${filteredCount === 1 ? "y" : "ies"}`}
      </Button>
      {message && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};
