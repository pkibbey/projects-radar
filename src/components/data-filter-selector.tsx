"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DATA_FILTER_LABELS,
  DEFAULT_DATA_FILTER,
  type DataFilter,
} from "@/lib/data-filters";

const FILTER_OPTIONS: Array<{ value: DataFilter; label: string }> = [
  { value: "all", label: DATA_FILTER_LABELS.all },
  { value: "with-data", label: DATA_FILTER_LABELS["with-data"] },
  { value: "without-data", label: DATA_FILTER_LABELS["without-data"] },
];

export type FilterOrder = "asc" | "desc";

type DataFilterSelectorProps = {
  value: DataFilter;
  order?: FilterOrder;
};

export const DataFilterSelector = ({ value, order = "asc" }: DataFilterSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (nextValue: string) => {
    if (!FILTER_OPTIONS.some((option) => option.value === nextValue)) {
      return;
    }

    const nextFilter = nextValue as DataFilter;
    if (nextFilter === value) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (nextFilter === DEFAULT_DATA_FILTER) {
      params.delete("data");
    } else {
      params.set("data", nextFilter);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleOrderChange = (nextOrder: string) => {
    if (!["asc", "desc"].includes(nextOrder)) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (nextOrder === "asc") {
      params.delete("filterOrder");
    } else {
      params.set("filterOrder", nextOrder);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        Filter
      </p>
      <div className="flex gap-2">
        <Select value={value} onValueChange={handleFilterChange} aria-label="Select data filter">
          <SelectTrigger className="w-full sm:w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={order}
          onValueChange={handleOrderChange}
          className="border border-slate-200 dark:border-slate-800 rounded-md"
        >
          <ToggleGroupItem
            value="asc"
            aria-label="Filter ascending"
            className="px-3"
          >
            <ArrowUp className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="desc"
            aria-label="Filter descending"
            className="px-3"
          >
            <ArrowDown className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
