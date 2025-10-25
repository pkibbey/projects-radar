"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortKey = "name" | "updated" | "completeness";
export type SortOrder = "asc" | "desc";

type SortSelectorProps = {
  value: SortKey;
};

export const SortSelector = ({ value }: SortSelectorProps) => {
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

  const options = [
    { value: "name", label: "Name" },
    { value: "updated", label: "Updated" },
    { value: "completeness", label: "Completeness" },
  ];

  return (
    <div className="flex gap-3 items-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        Sort
      </p>
      <div className="flex gap-3 items-center">
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
      </div>
    </div>
  );
};
