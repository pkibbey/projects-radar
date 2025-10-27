import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RepoProcessingStatus } from "@/lib/db";

const PROCESSING_STATUS_STYLES: Record<RepoProcessingStatus, string> = {
  pending: "bg-blue-500/10 text-blue-500 ring-blue-500/30",
  processing: "bg-amber-500/10 text-amber-500 ring-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-500 ring-rose-500/30",
};

const PROCESSING_STATUS_LABEL: Record<RepoProcessingStatus, string> = {
  pending: "Queued",
  processing: "Analyzing",
  completed: "Ready",
  failed: "Failed",
};

const PROCESSING_STATUS_ICON: Record<RepoProcessingStatus, string> = {
  pending: "📋",
  processing: "⚙️",
  completed: "✓",
  failed: "✕",
};

export const ProcessingStatusBadge = ({ status }: { status: RepoProcessingStatus }) => (
  <Badge
    variant="outline"
    className={cn("gap-1", PROCESSING_STATUS_STYLES[status])}
  >
    <span>{PROCESSING_STATUS_ICON[status]}</span>
    {PROCESSING_STATUS_LABEL[status]}
  </Badge>
);
