"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">Project Radar</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant={isActive("/queue-status") ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2",
              isActive("/queue-status") && "bg-primary text-primary-foreground"
            )}
          >
            <Link href="/queue-status">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Queue Status</span>
            </Link>
          </Button>

          <Button
            asChild
            variant={isActive("/queue-management") ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2",
              isActive("/queue-management") && "bg-primary text-primary-foreground"
            )}
          >
            <Link href="/queue-management">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Queue Management</span>
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
