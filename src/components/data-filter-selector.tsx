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
  DATA_FILTER_LABELS,
  DEFAULT_DATA_FILTER,
  type DataFilter,
} from "@/lib/data-filters";

const FILTER_OPTIONS: Array<{ value: DataFilter; label: string }> = [
  { value: "all", label: DATA_FILTER_LABELS.all },
  { value: "with-data", label: DATA_FILTER_LABELS["with-data"] },
  { value: "without-data", label: DATA_FILTER_LABELS["without-data"] },
];

type DataFilterSelectorProps = {
  value: DataFilter;
};

export const DataFilterSelector = ({ value }: DataFilterSelectorProps) => {
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

  return (
    <div className="flex gap-3 items-center">
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
      </div>
    </div>
  );
};
