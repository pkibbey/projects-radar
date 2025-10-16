"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Lightbulb, ListChecks } from "lucide-react";
import { useState } from "react";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/view-modes";
import { Badge } from "@/components/ui/badge";
import { RepoStatusBadge } from "@/components/repo-status-badge";
import { RepoActionsList } from "@/components/repo-actions-list";
import { RepoIntelligenceRefreshButton } from "@/components/repo-intelligence-refresh-button";
import { CompletenessIndicator } from "@/components/completeness-indicator";
import { LanguageIcon } from "@/components/language-icon";
import { EditableText } from "@/components/editable-text";
import { PackageJsonCleanerButton } from "@/components/repo-package-json-cleaner-button";

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
  const [currentSummary, setCurrentSummary] = useState(analysis?.summary ?? "");

  const updatedAtText = lastGeneratedAt
    ? formatDistanceToNow(new Date(lastGeneratedAt), { addSuffix: true })
    : null;

  const isList = mode === "list";
  const isCompact = mode === "compact";
  const isExpanded = mode === "expanded";

  const showInsights = hasData && !isList && !isCompact;
  const showActions = hasData && isExpanded;
  const insightLimit = isExpanded ? undefined : 3;
  const insights = showInsights
    ? (analysis?.insights ?? []).slice(0, insightLimit)
    : [];
  const showTopics = hasData && isExpanded && meta.topics.length > 0;
  const showPackages = hasData && !isList && (analysis?.packages?.length ?? 0) > 0;
  const packages = showPackages ? (analysis?.packages ?? []) : [];

  const cardSpacing = isList ? "gap-4 p-4" : isCompact ? "gap-5 p-5" : "gap-6 p-6";
  const refreshButtonSize = isList || isCompact ? "sm" : "md";
  const descriptionTone = isList ? "text-xs" : "text-sm";

  const hasLanguage = hasData && meta.primaryLanguage;

  const summaryText =
    currentSummary ||
    (hasData
      ? "Project data is stored, but AI insights are unavailable. Regenerate to refresh intelligence or add AI credentials."
      : "");

  const handleSaveSummary = async (newSummary: string) => {
    const response = await fetch(`/api/repos/${meta.owner}/${meta.name}/intelligence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: newSummary }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update summary");
    }

    setCurrentSummary(newSummary);
  };

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
            {hasLanguage && (
              <div className="flex items-center gap-2">
                <LanguageIcon
                  language={meta.primaryLanguage!}
                  className={cn(
                    "h-5 w-5",
                    isCompact && "h-4 w-4"
                  )}
                />
              </div>
            )}
            <RepoStatusBadge status={meta.status} />
            {hasData && typeof meta.completenessScore === "number" && (
              <CompletenessIndicator
                score={meta.completenessScore}
                size={isList || isCompact ? "sm" : "md"}
              />
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            <Link href={`/repos/${meta.owner}/${meta.name}`}>
              {meta.displayName}
            </Link>
          </h2>
          <p
            className={cn(
              "max-w-2xl text-slate-600 dark:text-slate-300",
              descriptionTone,
            )}
          >
            {hasData
              ? meta.description ?? "No description provided."
              : "Generate data to pull the latest repository description and metadata from GitHub."}
          </p>
        </div>
        <div className="flex gap-2">
          <PackageJsonCleanerButton
            owner={meta.owner}
            repo={meta.name}
            size={refreshButtonSize}
            onSuccess={() => {
              // Optionally trigger a page refresh or show a notification
              window.location.reload();
            }}
          />
          <RepoIntelligenceRefreshButton
            owner={meta.owner}
            repo={meta.name}
            size={refreshButtonSize}
            idleLabel={hasData ? "Refresh" : "Generate"}
            loadingLabel={hasData ? "Refreshing…" : "Generating…"}
            successMessage={
              hasData
                ? "Latest insights loaded."
                : ""
            }
            useDataEndpoint={true}
          />
        </div>
      </header>

      {(showPackages ||
        (summaryText && !isList) ||
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
            {showPackages && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {packages.map((pkg) => (
                    <Badge key={pkg} variant="secondary">
                      {pkg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {summaryText && !isList && <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <Lightbulb className="h-4 w-4" /> AI Summary
              </h3>
              <EditableText
                value={summaryText}
                onSave={handleSaveSummary}
                className={cn(
                  "leading-relaxed text-slate-700 dark:text-slate-200",
                  isList ? "mt-1 text-sm" : "mt-2 text-sm",
                )}
                placeholder="No summary available. Double-click to add one."
              />
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
            <Badge key={topic} variant="outline">
              #{topic}
            </Badge>
          ))}
        </footer>
      )}

      {updatedAtText && !isList && (
        <p className="text-right text-xs text-slate-400 dark:text-slate-500">
          Updated {updatedAtText}
          {analysis?.analysisDurationMs && (
            <>
              {" • "}
              Analyzed in {(analysis.analysisDurationMs / 1000).toFixed(1)}s
            </>
          )}
        </p>
      )}
    </article>
  );
};
