"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORK_FILTER_OPTIONS, getForkFilterLabel, type ForkFilter } from "@/lib/fork-filters";

type ForkFilterSelectorProps = {
  value: ForkFilter;
};

export const ForkFilterSelector = ({ value }: ForkFilterSelectorProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (newFilter: ForkFilter) => {
    const params = new URLSearchParams(searchParams);
    params.set("fork", newFilter);
    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={(val) => handleChange(val as ForkFilter)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FORK_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {getForkFilterLabel(option as ForkFilter)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
