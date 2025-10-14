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

export type DataFilterSelectorProps = {
  value: DataFilter;
};

export const DataFilterSelector = ({ value }: DataFilterSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextValue: string) => {
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
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        Data filter
      </p>
      <Select value={value} onValueChange={handleChange} aria-label="Select data filter">
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
  );
};
