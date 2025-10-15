"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Lightbulb, ListChecks } from "lucide-react";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/view-modes";
import { RepoStatusBadge } from "@/components/repo-status-badge";
import { RepoActionsList } from "@/components/repo-actions-list";
import { RepoIntelligenceRefreshButton } from "@/components/repo-intelligence-refresh-button";
import { CompletenessIndicator } from "@/components/completeness-indicator";

export type RepoCardProps = {
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  hasData: boolean;
  lastGeneratedAt?: string;
  mode: ViewMode;
  id?: string;
};

export const RepoCard = ({
  bundle,
  analysis,
  hasData,
  lastGeneratedAt,
  mode,
  id,
}: RepoCardProps) => {
  const { meta } = bundle;

  const lastUpdatedText = hasData
    ? formatDistanceToNow(new Date(meta.pushedAt), { addSuffix: true })
    : null;
  const updatedAtText = lastGeneratedAt
    ? formatDistanceToNow(new Date(lastGeneratedAt), { addSuffix: true })
    : null;

  const isList = mode === "list";
  const isCompact = mode === "compact";
  const isExpanded = mode === "expanded";

  const showMetrics = hasData && !isList;
  const showInsights = hasData && !isList && !isCompact;
  const showActions = hasData && isExpanded;
  const insightLimit = isExpanded ? undefined : 3;
  const insights = showInsights
    ? (analysis?.insights ?? []).slice(0, insightLimit)
    : [];
  const showTopics = hasData && isExpanded && meta.topics.length > 0;

  const cardSpacing = isList ? "gap-4 p-4" : isCompact ? "gap-5 p-5" : "gap-6 p-6";
  const detailButtonSize = isList || isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const refreshButtonSize = isList || isCompact ? "sm" : "md";
  const descriptionTone = isList ? "text-xs" : "text-sm";

  const metrics = showMetrics
    ? (() => {
        const base = [];
        if (meta.primaryLanguage) {
          base.push(`💻 ${meta.primaryLanguage}`);
        }
        return base;
      })()
    : [];

  const summaryText =
    analysis?.summary ??
    (hasData
      ? "Project data is stored, but AI insights are unavailable. Regenerate to refresh intelligence or add AI credentials."
      : "");

  return (
    <article
      id={id}
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        cardSpacing,
        "scroll-mt-42",
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-3",
          isList && "gap-2",
        )}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RepoStatusBadge status={meta.status} />
            {hasData && typeof meta.completenessScore === "number" && (
              <CompletenessIndicator
                score={meta.completenessScore}
                size={isList || isCompact ? "sm" : "md"}
              />
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lastUpdatedText ? `Repo updated ${lastUpdatedText}` : "No cached repository data"}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {meta.displayName}
          </h2>
          <p
            className={cn(
              "max-w-2xl text-slate-600 dark:text-slate-300",
              descriptionTone,
            )}
          >
            {hasData
              ? meta.description ?? "No description provided."
              : "Generate cached data to pull the latest repository description and metadata from GitHub."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-start">
          <RepoIntelligenceRefreshButton
            owner={meta.owner}
            repo={meta.name}
            size={refreshButtonSize}
            idleLabel={hasData ? "Refresh data" : "Generate data"}
            loadingLabel={hasData ? "Refreshing…" : "Generating…"}
            successMessage={
              hasData
                ? "Latest insights loaded."
                : "Data generated. Loading fresh metrics…"
            }
            useDataEndpoint={true}
          />
          <Link
            href={`/repos/${meta.owner}/${meta.name}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-slate-200 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
              detailButtonSize,
            )}
          >
            View details
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {(showMetrics ||
        summaryText ||
        insights.length > 0 ||
        showActions
      ) && (
        <section
          className={cn(
            "grid gap-4",
            showActions ? "md:grid-cols-[2fr_1fr]" : "",
          )}
        >
          <div className="space-y-4">
            {showMetrics && (
              <div
                className={cn(
                  "flex flex-wrap gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300",
                  isCompact && "text-xs",
                )}
              >
                {metrics.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}

            {summaryText && <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <Lightbulb className="h-4 w-4" /> AI Summary
              </h3>
              <p
                className={cn(
                  "leading-relaxed text-slate-700 dark:text-slate-200",
                  isList ? "mt-1 text-sm" : "mt-2 text-sm",
                )}
              >
                {summaryText}
              </p>
            </div>}

            {insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <ListChecks className="h-4 w-4" /> Key insights
                </h3>
                <ul className="grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                  {insights.map((insight) => (
                    <li
                      key={insight.title}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <p className="font-medium">{insight.title}</p>
                      {isExpanded && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {insight.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {showActions && <RepoActionsList actions={analysis?.actions ?? []} />}
        </section>
      )}

      {showTopics && (
        <footer className="flex flex-wrap gap-2">
          {meta.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              #{topic}
            </span>
          ))}
        </footer>
      )}

      {updatedAtText && (
        <p className="text-right text-xs text-slate-400 dark:text-slate-500">
          Updated {updatedAtText}
        </p>
      )}
    </article>
  );
};
