"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ForkFilter } from "@/lib/fork-filters";
import type { GitHubUserRepo } from "@/lib/github-user-repos";

type UnhideAllReposButtonProps = {
  forkFilter?: ForkFilter;
  repos?: GitHubUserRepo[];
};

export const UnhideAllReposButton = ({
  forkFilter = "all",
  repos = [],
}: UnhideAllReposButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [unhideCount, setUnhideCount] = useState(0);

  // Calculate which repos can be unhidden based on current filters
  const calculateUnhideCount = useCallback(async () => {
    try {
      const response = await fetch("/api/repos/visibility");
      const data = await response.json();
      const hiddenReposSet = new Set(data.hidden || []);

      // Count hidden repos that match current filters
      const unhidableRepos = repos.filter((repo) => {
        const repoKey = `${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}`;

        // Only count if repo is hidden
        if (!hiddenReposSet.has(repoKey)) return false;

        // Apply fork filter
        if (forkFilter === "with-forks") {
          if (!repo.isFork) return false;
        }
        if (forkFilter === "without-forks") {
          if (repo.isFork) return false;
        }
        return true;
      });

      return unhidableRepos.length;
    } catch (e) {
      console.error("Failed to calculate unhide count:", e);
      return 0;
    }
  }, [forkFilter, repos]);

  // Update unhide count when dependencies change
  useEffect(() => {
    calculateUnhideCount().then(setUnhideCount);
  }, [calculateUnhideCount]);

  const handleUnhideAll = useCallback(async () => {
    if (status === "loading" || unhideCount === 0) {
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/repos/visibility/unhide-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          forkFilter,
        }),
      });

      let payload: {
        ok?: boolean;
        message?: string;
        error?: string;
        unhiddenCount?: number;
      } = {};

      try {
        payload = await response.json();
      } catch (e) {
        console.error("Failed to parse response JSON:", e);
      }

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to unhide repositories. Status: ${response.status}`);
      }

      setStatus("success");
      setMessage(
        payload.message ??
        `Unhid ${payload.unhiddenCount ?? 0} repositories.`
      );

      // Refresh after a short delay
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to unhide repositories. Check server logs for details."
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 5000);
    }
  }, [status, unhideCount, forkFilter, router]);

  if (unhideCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button
        type="button"
        onClick={handleUnhideAll}
        variant="outline"
        size="sm"
        disabled={status === "loading"}
        aria-label="Unhide repositories"
        className="cursor-pointer"
      >
        {status === "loading" ? (
          "Unhiding…"
        ) : (
          <>
            <Eye className="h-4 w-4 mr-1" />
            Unhide {unhideCount}
          </>
        )}
      </Button>
      {message && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};
