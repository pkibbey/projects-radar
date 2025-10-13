"use client";

import { useState } from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";
import type { RepoAction } from "@/lib/ai";

export const RepoActionsList = ({ actions }: { actions: RepoAction[] }) => {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  if (!actions.length) {
    return (
      <aside className="h-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        AI actions will appear here after analysis completes.
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        <ClipboardList className="h-4 w-4" /> Suggested actions
      </h3>
      <ul className="grid gap-3 text-sm">
        {actions.map((action) => {
          const isCopied = copiedAction === action.title;
          return (
            <li
              key={action.title}
              className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {action.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {action.instruction}
              </p>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(action.instruction);
                    setCopiedAction(action.title);
                    setTimeout(() => setCopiedAction(null), 2000);
                  } catch (error) {
                    console.error("Failed to copy action instruction", error);
                  }
                }}
              >
                {isCopied ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" /> Copy steps
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
