"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SortOrder } from "./sort-selector";

type OrderSelectorProps = {
  order?: SortOrder;
};

export const OrderSelector = ({ order = "asc" }: OrderSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  return (
    <div className="flex gap-3 items-center">      
      <div className="flex gap-3 items-center">
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
        {order === 'asc' ? 'Asc' : 'Desc'}
      </p>
    </div>
  );
};
