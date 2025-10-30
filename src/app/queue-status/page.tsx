"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function QueueStatusPage() {
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      if (selectedQueue) params.append("queue", selectedQueue);
      if (selectedStatus) params.append("status", selectedStatus);
      params.append("limit", "100");

      const response = await fetch(`/api/queue/status?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
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

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const formatData = (data: Record<string, any>) => {
    const { owner, repo, token: _token, ...rest } = data;
    return {
      owner,
      repo,
      ...rest,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Queue Status Monitor
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track BullMQ job queue status and repository processing progress
          </p>
        </header>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Button
              onClick={fetchStatus}
              disabled={status === "loading"}
              variant="outline"
              size="sm"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Now
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
            </Button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "Never"}
          </div>
        </div>

        {/* Queue Overview */}
        {data && Object.keys(data.queues).length > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.queues).map(([queueName, queueData]) => {
              if (queueData.error) return null;

              const total =
                queueData.counts.waiting +
                queueData.counts.active +
                queueData.counts.completed +
                queueData.counts.failed;

              return (
                <button
                  key={queueName}
                  onClick={() => setSelectedQueue(queueName === selectedQueue ? null : queueName)}
                  className={`rounded-lg border-2 p-4 text-left transition ${
                    selectedQueue === queueName
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {queueName}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {total}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div>
                      🔄 Active: <span className="font-semibold">{queueData.counts.active}</span>
                    </div>
                    <div>
                      ⏳ Waiting: <span className="font-semibold">{queueData.counts.waiting}</span>
                    </div>
                    <div>
                      ✅ Completed: <span className="font-semibold">{queueData.counts.completed}</span>
                    </div>
                    <div>
                      ❌ Failed: <span className="font-semibold">{queueData.counts.failed}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Jobs Table */}
        {data && Object.keys(data.queues).length > 0 && (
          <div className="space-y-6">
            {Object.entries(data.queues).map(([queueName, queueData]) => {
              if (queueData.error) {
                return (
                  <div key={queueName} className="rounded-lg border border-red-300 bg-red-50 p-4">
                    <p className="font-semibold text-red-900">Error in {queueName}</p>
                    <p className="text-sm text-red-800">{queueData.error}</p>
                  </div>
                );
              }

              // If a specific queue is selected, only show that queue
              if (selectedQueue && queueName !== selectedQueue) {
                return null;
              }

              const jobsByStatus = queueData.jobs;

              return (
                <div key={queueName} className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {queueName}
                    </h2>
                  </div>

                  {/* Status Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {Object.entries(queueData.counts).map(([status, count]) => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                          selectedStatus === status
                            ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        {status} ({count})
                      </button>
                    ))}
                  </div>

                  {/* Jobs List */}
                  {jobsByStatus[selectedStatus] && jobsByStatus[selectedStatus].length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Job ID</TableHead>
                            <TableHead>Repository</TableHead>
                            <TableHead>Attempts</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobsByStatus[selectedStatus].map((job) => {
                            const displayData = formatData(job.data);
                            return (
                              <TableRow key={job.id}>
                                <TableCell className="font-mono text-xs">
                                  {job.id?.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                  {displayData.owner && displayData.repo ? (
                                    <a
                                      href={`/repos/${displayData.owner}/${displayData.repo}`}
                                      className="text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                      {displayData.owner}/{displayData.repo}
                                    </a>
                                  ) : (
                                    <span className="text-slate-500">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {job.attemptsMade || 0}/{job.attemptsStarted || 0}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div>{formatTime(job.timestamp)}</div>
                                  {job.finishedOn && (
                                    <div className="text-slate-500 dark:text-slate-400">
                                      Finished: {formatTime(job.finishedOn)}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {job.failedReason && (
                                    <div className="max-w-xs overflow-hidden text-ellipsis text-xs text-red-600 dark:text-red-400">
                                      {job.failedReason}
                                    </div>
                                  )}
                                  {job.progress && typeof job.progress === "number" && (
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                      Progress: {(job.progress * 100).toFixed(0)}%
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No jobs in {selectedStatus} status
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!data && status === "loading" && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}
