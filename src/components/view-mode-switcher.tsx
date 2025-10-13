"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_VIEW_MODE,
  isViewMode,
  VIEW_MODE_LABELS,
  VIEW_MODES,
  type ViewMode,
} from "@/lib/view-modes";

export type ViewModeSwitcherProps = {
  value: ViewMode;
};

export const ViewModeSwitcher = ({ value }: ViewModeSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextValue: string) => {
    if (!isViewMode(nextValue) || nextValue === value) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (nextValue === DEFAULT_VIEW_MODE) {
      params.delete("view");
    } else {
      params.set("view", nextValue);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        View mode
      </p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={handleChange}
        aria-label="Select view mode"
      >
        {VIEW_MODES.map((mode) => (
          <ToggleGroupItem key={mode} value={mode} aria-label={VIEW_MODE_LABELS[mode]}>
            {VIEW_MODE_LABELS[mode]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
