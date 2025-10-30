"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type SingleReadmeButtonProps = {
  owner: string;
  repo: string;
};

export const SingleReadmeButton = ({
  owner,
  repo,
}: SingleReadmeButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch(`/api/repos/${owner}/${repo}/readme`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to generate README.");
      }

      setStatus("success");
      setMessage("README generation queued!");
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate README. Check server logs for details.",
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 4000);
    }
  }, [owner, repo, status, router]);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="sm"
        disabled={status === "loading"}
        aria-label="Generate README"
        className="cursor-pointer"
        title="Generate and commit README to repository"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
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
