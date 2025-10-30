"use client";

import { InfoIcon } from "lucide-react";
import { Button } from "./ui/button";

type ShowInfoButtonProps = {
  isExpanded: boolean;
  onToggle: () => void;
};

export const ShowInfoButton = ({ isExpanded, onToggle }: ShowInfoButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      title={isExpanded ? "Hide info" : "Show info"}
      className="h-7 w-7 rounded-full bg-slate-100/80 text-slate-500 hover:bg-orange-200 hover:text-orange-700 dark:bg-slate-800/80 dark:hover:bg-orange-700 dark:hover:text-orange-200 cursor-pointer border"
    >
      <InfoIcon className="h-4 w-4" />
    </Button>
  );
};
