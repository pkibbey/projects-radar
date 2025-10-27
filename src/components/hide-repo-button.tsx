import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type HideRepoButtonProps = {
  owner: string;
  repo: string;
};

export const HideRepoButton = ({ owner, repo }: HideRepoButtonProps) => {
  const [isHiding, setIsHiding] = useState(false);
  const router = useRouter();

  const handleHide = async () => {
    setIsHiding(true);
    try {
      const response = await fetch(`/api/repos/${owner}/${repo}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to hide repository");
      }

      // Refresh the page to remove the hidden repo
      router.refresh();
    } catch (error) {
      console.error("Failed to hide repository:", error);
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleHide}
      disabled={isHiding}
      title="Hide this repository"
      className="h-7 w-7 rounded-full bg-slate-100/80 text-slate-500 hover:bg-red-200 hover:text-red-700 dark:bg-slate-800/80 dark:hover:bg-red-700 dark:hover:text-red-200 cursor-pointer border"
    >
      ✕
    </Button>
  );
};
