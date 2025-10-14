"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select value={value} onValueChange={handleChange} aria-label="Select view mode">
        <SelectTrigger className="w-full sm:w-fit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {VIEW_MODE_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
