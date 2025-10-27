"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RepoIntelligenceRefreshButtonProps = {
  owner: string;
  repo: string;
  size?: "sm" | "md";
  useDataEndpoint?: boolean; // if true, call /data instead of /intelligence
  idleLabel?: string;
  loadingLabel?: string;
  successMessage?: string;
  onSuccess?: (data: Record<string, unknown>) => void;
};

export const RepoIntelligenceRefreshButton = ({
  owner,
  repo,
  useDataEndpoint = true,
  idleLabel = "Regenerate AI",
  loadingLabel = "Processing…",
  successMessage = "Latest data loaded.",
  onSuccess,
}: RepoIntelligenceRefreshButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const endpoint = useDataEndpoint ? `/api/repos/${owner}/${repo}/data` : `/api/repos/${owner}/${repo}/intelligence`;
      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to trigger regeneration.");
      }

      const data = await response.json();
      setStatus("success");
      setMessage(successMessage);
      
      // Call the onSuccess callback with the updated data
      if (onSuccess) {
        onSuccess(data);
      }
      
      router.refresh();
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
  }, [owner, repo, status, successMessage, useDataEndpoint, router, onSuccess]);

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="sm"
        disabled={status === "loading"}
        aria-label="Regenerate project intelligence"
        className="cursor-pointer"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
        {status === "loading" ? loadingLabel : idleLabel}
      </Button>
      {message && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
};
