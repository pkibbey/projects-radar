"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check } from "lucide-react";
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

  const handleClick = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    setStatus("loading");

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
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      setStatus("error");
      console.error(
        error instanceof Error
          ? error.message
          : "Unable to generate screenshot. Check server logs for details.",
      );
    } finally {
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }
  }, [owner, repo, status, router]);

  return (
    <Button
      type="button"
      onClick={handleClick}
      variant="outline"
      size="sm"
      disabled={status === "loading" || status === "success"}
      aria-label="Generate screenshot"
      className="cursor-pointer"
      title="Generate and add screenshot to README"
    >
      {status === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === "success" ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
    </Button>
  );
};
