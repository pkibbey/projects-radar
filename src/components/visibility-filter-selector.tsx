"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VISIBILITY_FILTER_OPTIONS, getVisibilityFilterLabel, type VisibilityFilter } from "@/lib/visibility-filters";

type VisibilityFilterSelectorProps = {
  value: VisibilityFilter;
};

export const VisibilityFilterSelector = ({ value }: VisibilityFilterSelectorProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (newFilter: VisibilityFilter) => {
    const params = new URLSearchParams(searchParams);
    params.set("visibility", newFilter);
    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={(val) => handleChange(val as VisibilityFilter)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VISIBILITY_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {getVisibilityFilterLabel(option as VisibilityFilter)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
