"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RefreshRepositoriesButtonProps = {
  disabled?: boolean;
};

export const RefreshRepositoriesButton = ({
  disabled = false,
}: RefreshRepositoriesButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === "loading" || disabled) {
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/repos/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to sync repositories.");
      }

      const data = await response.json() as { count?: number };
      setStatus("success");
      setMessage(`Synced ${data.count ?? 0} repositories from GitHub.`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sync repositories. Check server logs for details."
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 4000);
    }
  }, [status, disabled, router]);

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="default"
        disabled={status === "loading" || disabled}
        aria-label="Refresh repositories from GitHub"
        className="rounded-full cursor-pointer"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {status === "loading" ? "Loading…" : "Load Repos"}
      </Button>
      {message && (
        <p className={`max-w-xs text-xs ${
          status === "error" 
            ? "text-red-600 dark:text-red-400" 
            : status === "success"
            ? "text-green-600 dark:text-green-400"
            : "text-slate-500 dark:text-slate-400"
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};
