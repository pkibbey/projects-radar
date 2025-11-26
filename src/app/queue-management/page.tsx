"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const QUEUE_NAMES = [
  "process-single-repository",
  "process-batch-repositories",
  "refresh-repository-intelligence",
  "sync-repositories-from-github",
  "process-repository-data",
  "generate-single-short-description",
  "generate-batch-short-descriptions",
  "generate-single-readme",
  "generate-batch-readmes",
  "generate-single-screenshot",
  "generate-batch-screenshots",
];

const JOB_STATUSES = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
];

type QueueJob = {
  id: string;
  name: string;
  data: Record<string, any>;
  progress?: number;
  attemptsMade?: number;
  attemptsStarted?: number;
  timestamp?: number;
  finishedOn?: number;
  failedReason?: string;
};

type QueueStats = {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  jobs: Record<string, QueueJob[]>;
  error?: string;
};

type QueueStatusResponse = {
  ok: boolean;
  timestamp: string;
  queues: Record<string, QueueStats>;
  filters: {
    queue: string | null;
    status: string | null;
    limit: number;
  };
};

export default function QueueManagementPage() {
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string>(QUEUE_NAMES[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStatus = async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      params.append("queue", selectedQueue);
      params.append("status", selectedStatus);
      params.append("limit", "100");

      const response = await fetch(`/api/queue/status?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
      setActionMessage({
        type: "error",
        message: "Failed to fetch queue status",
      });
    } finally {
      setStatus("idle");
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueue, selectedStatus]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, selectedQueue, selectedStatus]);

  const handleJobAction = async (
    action: "pause" | "resume" | "remove" | "retry",
    queueName: string,
    jobId: string
  ) => {
    setActionLoading(`${action}-${jobId}`);
    try {
      const response = await fetch("/api/queue/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          queueName,
          jobId,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setActionMessage({
          type: "success",
          message: `Job ${action}ed successfully`,
        });
        // Refresh the queue status
        setTimeout(() => fetchStatus(), 500);
      } else {
        setActionMessage({
          type: "error",
          message: result.error || `Failed to ${action} job`,
        });
      }
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
      setActionMessage({
        type: "error",
        message: `Failed to ${action} job`,
      });
    } finally {
      setActionLoading(null);
      // Clear message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const formatData = (data: Record<string, any>) => {
    const { token: _token, ...rest } = data;
    return rest;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const queueStats =
    data && selectedQueue in data.queues ? data.queues[selectedQueue] : null;
  const jobs =
    queueStats && selectedStatus in queueStats.jobs
      ? queueStats.jobs[selectedStatus]
      : [];

  const isLoading = status === "loading";
  const isActionLoading = actionLoading !== null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage BullMQ queue items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <Button
            onClick={() => fetchStatus()}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {actionMessage && (
        <Alert variant={actionMessage.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{actionMessage.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <label className="text-sm font-medium">Queue</label>
          <Select value={selectedQueue} onValueChange={setSelectedQueue}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUEUE_NAMES.map((queue) => (
                <SelectItem key={queue} value={queue}>
                  {queue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Status</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                  {queueStats && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({queueStats.counts[status as keyof typeof queueStats.counts]})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {queueStats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {Object.entries(queueStats.counts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="text-sm font-medium text-muted-foreground capitalize">
                {status}
              </div>
              <div className="mt-2 text-2xl font-bold">{count}</div>
            </div>
          ))}
        </div>
      )}

      {queueStats && !queueStats.error ? (
        <div className="rounded-lg border">
          {jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">
                      {job.id}
                    </TableCell>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <details>
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          view
                        </summary>
                        <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(formatData(job.data), null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                    <TableCell>
                      {job.progress ? `${job.progress}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {job.attemptsMade}/{job.attemptsStarted}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTime(job.timestamp)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {selectedStatus === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleJobAction("pause", selectedQueue, job.id)
                            }
                            title="Pause job"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {(selectedStatus === "paused" ||
                          selectedStatus === "delayed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleJobAction("resume", selectedQueue, job.id)
                            }
                            title="Resume job"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {selectedStatus === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleJobAction("retry", selectedQueue, job.id)
                            }
                            title="Retry job"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isActionLoading}
                          onClick={() =>
                            handleJobAction("remove", selectedQueue, job.id)
                          }
                          title="Remove job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No jobs found in {selectedStatus} status
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {queueStats?.error || "Failed to load queue"}
          </p>
        </div>
      )}

      {isLoading && jobs.length === 0 && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
