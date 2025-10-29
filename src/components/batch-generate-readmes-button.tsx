"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataFilter } from "@/lib/data-filters";
import type { ForkFilter } from "@/lib/fork-filters";
import type { GitHubUserRepo } from "@/lib/github-user-repos";

type BatchGenerateReadmesButtonProps = {
  dataFilter?: DataFilter;
  forkFilter?: ForkFilter;
  repos?: GitHubUserRepo[];
};

export const BatchGenerateReadmesButton = ({
  dataFilter = "all",
  forkFilter = "all",
  repos = [],
}: BatchGenerateReadmesButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);

  // Calculate which repos match the current filters
  const calculateFilteredCount = useCallback(async () => {
    // Fetch hidden repos
    try {
      const response = await fetch("/api/repos/visibility");
      const data = await response.json();
      const hiddenReposSet = new Set(data.hidden || []);
      
      // Get repos that are not hidden
      const reposToProcess = repos.filter((repo) => {
        const repoKey = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;
        
        // Filter out hidden repos
        if (hiddenReposSet.has(repoKey)) return false;
        
        // Apply fork filter
        if (forkFilter === "with-forks") {
          if (!repo.isFork) return false;
        }
        if (forkFilter === "without-forks") {
          if (repo.isFork) return false;
        }
        return true;
      });
      return reposToProcess.length;
    } catch (e) {
      console.error("Failed to calculate filtered count:", e);
      return 0;
    }
  }, [forkFilter, repos]);

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
      const response = await fetch("/api/batch/generate-readmes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataFilter,
          forkFilter,
        }),
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
        `Queued ${filteredCount} ${filteredCount === 1 ? "repository" : "repositories"} for README generation. Check back in a few moments!`
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
          : "Unable to queue README generation. Check server logs for details."
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 5000);
    }
  }, [status, filteredCount, dataFilter, forkFilter, router]);

  if (filteredCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button
        type="button"
        onClick={handleClick}
        variant="default"
        size="default"
        disabled={status === "loading"}
        aria-label="Generate READMEs for repositories"
        className="rounded-full cursor-pointer"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {status === "loading"
          ? "Queuing…"
          : `Generate ${filteredCount} README${filteredCount === 1 ? "" : "s"}`}
      </Button>
      {message && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};
