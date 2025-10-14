"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: React.ReactNode };

export type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
};

export const Select = ({ value, onValueChange, options, className }: SelectProps) => {
  return (
    <div className={cn("relative inline-flex items-center h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300", className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="appearance-none bg-transparent pr-6 text-xs font-medium outline-none"
        aria-label="Select"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 flex items-center">
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </span>
    </div>
  );
};
