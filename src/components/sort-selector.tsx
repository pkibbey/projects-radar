"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SortKey = "name" | "updated" | "completeness";
export type SortOrder = "asc" | "desc";

type SortSelectorProps = {
  value: SortKey;
  order?: SortOrder;
};

export const SortSelector = ({ value, order = "asc" }: SortSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (next: string) => {
    const key = next as SortKey;

    if (key === value) {
      return;
    }
    const params = new URLSearchParams();
    if (searchParams) {
      for (const k of searchParams.keys()) {
        const v = searchParams.get(k) ?? "";
        params.set(k, v);
      }
    }

    if (key === "name") {
      params.delete("sort");
    } else {
      params.set("sort", key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleOrderChange = (nextOrder: string) => {
    if (!["asc", "desc"].includes(nextOrder)) {
      return;
    }

    const params = new URLSearchParams();
    if (searchParams) {
      for (const k of searchParams.keys()) {
        const v = searchParams.get(k) ?? "";
        params.set(k, v);
      }
    }

    if (nextOrder === "asc") {
      params.delete("order");
    } else {
      params.set("order", nextOrder);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const options = [
    { value: "name", label: "Name" },
    { value: "updated", label: "Updated" },
    { value: "completeness", label: "Completeness" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        Sort
      </p>
      <div className="flex gap-2">
        <Select value={value} onValueChange={handleSortChange} aria-label="Select sort">
          <SelectTrigger className="w-full sm:w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
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
            aria-label="Sort ascending"
            className="px-3"
          >
            <ArrowUp className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="desc"
            aria-label="Sort descending"
            className="px-3"
          >
            <ArrowDown className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
