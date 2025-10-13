import { RepoStatus } from "@/lib/github";

const STATUS_STYLES: Record<RepoStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/30",
  maintenance: "bg-amber-500/10 text-amber-500 ring-amber-500/30",
  stale: "bg-rose-500/10 text-rose-500 ring-rose-500/30",
  archived: "bg-slate-500/10 text-slate-400 ring-slate-500/30",
};

const STATUS_LABEL: Record<RepoStatus, string> = {
  active: "Active",
  maintenance: "Maintenance",
  stale: "Stale",
  archived: "Archived",
};

export const RepoStatusBadge = ({ status }: { status: RepoStatus }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
  >
    <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
    {STATUS_LABEL[status]}
  </span>
);
