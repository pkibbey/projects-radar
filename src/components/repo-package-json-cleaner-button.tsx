"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type PackageJsonCleanerButtonProps = {
  owner: string;
  repo: string;
  size?: "sm" | "md" | "lg";
  onSuccess?: () => void;
};

export const PackageJsonCleanerButton = ({
  owner,
  repo,
  size = "md",
  onSuccess,
}: PackageJsonCleanerButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClean = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/repos/${owner}/${repo}/package-json`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clean package.json");
      }

      setMessage("package.json enhanced successfully! ✨");
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Failed to clean package.json:", err);

      // Auto-clear error message after 8 seconds
      setTimeout(() => {
        setError(null);
      }, 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default";

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClean}
        disabled={isLoading}
        size={buttonSize}
        variant="outline"
        className="gap-2"
      >
        <Sparkles className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        {isLoading ? "Cleaning..." : "Clean package.json"}
      </Button>
      
      {message && (
        <p className="text-xs text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
