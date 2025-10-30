"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

type SingleScreenshotButtonProps = {
  owner: string;
  repo: string;
};

export const SingleScreenshotButton = ({
  owner,
  repo,
}: SingleScreenshotButtonProps) => {
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
      const response = await fetch(`/api/repos/${owner}/${repo}/screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to generate screenshot.");
      }

      setStatus("success");
      setMessage("Screenshot queued. Check back in a few moments!");
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate screenshot. Check server logs for details.",
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
        aria-label="Generate screenshot"
        className="cursor-pointer"
        title="Generate and add screenshot to README"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
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
