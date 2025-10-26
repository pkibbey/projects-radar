"use client";

import { ClipboardList } from "lucide-react";
import type { RepoAction } from "@/lib/ai";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RepoActionsListProps = {
  actions: RepoAction[];
};

export const RepoActionsList = ({ 
  actions
}: RepoActionsListProps) => {
  if (!actions.length) {
    return (
      <aside>
        AI actions will appear here after analysis completes.
      </aside>
    );
  }

  return (
    <aside>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="flex items-center min-w-[200px] max-w-[200px]">
              <ClipboardList className="h-4 w-4" />
              Suggested Action
            </TableHead>
            <TableHead className="min-w-[300px] max-w-[300px]">Instructions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => (
            <TableRow key={action.title}>
              <TableCell className="min-w-[200px] max-w-[200px] truncate font-medium text-slate-800 dark:text-slate-100" title={action.title}>
                {action.title}
              </TableCell>
              <TableCell className="min-w-[300px] max-w-[300px] truncate text-slate-500 dark:text-slate-400" title={action.instruction}>
                {action.instruction}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </aside>
  );
};
