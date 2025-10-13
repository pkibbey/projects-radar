"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type RepoIntelligenceRefreshButtonProps = {
  owner: string;
  repo: string;
  size?: "sm" | "md";
};

export const RepoIntelligenceRefreshButton = ({ owner, repo, size = "md" }: RepoIntelligenceRefreshButtonProps) => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch(`/api/repos/${owner}/${repo}/intelligence`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to trigger regeneration.");
      }

      setStatus("success");
      setMessage("Regeneration queued. Refresh shortly to see updated insights.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to trigger regeneration. Check server logs for details.",
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
      }, 4000);
    }
  }, [owner, repo, status]);

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-slate-200 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
          size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
        )}
        disabled={status === "loading"}
        aria-label="Regenerate project intelligence"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
        {status === "loading" ? "Processing…" : "Regenerate AI"}
      </button>
      {message && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};
