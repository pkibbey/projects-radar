"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SortKey = "name" | "stars" | "updated" | "completeness";

export const SortSelector = ({ value }: { value: SortKey }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (next: string) => {
    const key = next as SortKey;
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
    { value: "stars", label: "Stars" },
    { value: "updated", label: "Recently updated" },
    { value: "completeness", label: "Completeness" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        Sort
      </p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={handleChange}
        aria-label="Select sort"
      >
        {options.map((opt) => (
          <ToggleGroupItem key={opt.value} value={opt.value} aria-label={String(opt.label)}>
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
