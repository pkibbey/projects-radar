"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import type { RepoStatusRecord } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { HideRepoButton } from "@/components/hide-repo-button";
import { LanguageIcon } from "@/components/language-icon";
import { EditableText } from "@/components/editable-text";
import { TechStackDisplay } from "@/components/tech-stack-display";
import { OwnershipBadge } from "@/components/ownership-badge";
import { InfoIcon } from "lucide-react";
import { ExternalLinkButton } from "./external-link-button";
import { Button } from "./ui/button";

type RepoCardProps = {
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  hasData: boolean;
  lastGeneratedAt?: string;
  id?: string;
  processingStatus?: RepoStatusRecord;
};

export const RepoCard = ({
  bundle,
  analysis,
  hasData,
  lastGeneratedAt,
  id,
  processingStatus,
}: RepoCardProps) => {
  const { meta } = bundle;
  const [currentSummary, setCurrentSummary] = useState(analysis?.summary ?? "");
  const [currentAnalysis] = useState(analysis);
  const [isExpanded, setIsExpanded] = useState(false);

  const updatedAtText = lastGeneratedAt
    ? formatDistanceToNow(new Date(lastGeneratedAt), { addSuffix: true })
    : null;

  const showActions = hasData;
  const showTopics = hasData && meta.topics.length > 0;
  const showPackages = hasData && (currentAnalysis?.packages?.length ?? 0) > 0;
  const packages = showPackages ? (currentAnalysis?.packages ?? []) : [];

  const cardSpacing = "gap-1 p-3";
  const descriptionTone = "text-sm";

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
        "relative flex flex-col rounded border border-slate-200 bg-white shadow-sm transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900",
        cardSpacing,
        "scroll-mt-42",
      )}
    >
      <div className="absolute -right-3 -top-3 z-10 flex gap-2 items-center">
        {updatedAtText && (
          <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 px-3 leading-7 rounded-xl border">
            Updated {updatedAtText}
            {currentAnalysis?.analysisDurationMs && (
              <>
                {" • "}
                Analyzed in {(currentAnalysis.analysisDurationMs / 1000).toFixed(1)}s
              </>
            )}
          </p>
        )}
        <ExternalLinkButton htmlUrl={meta.htmlUrl} />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Hide info" : "Show info"}
          className="h-7 w-7 rounded-full bg-slate-100/80 text-slate-500 hover:bg-orange-200 hover:text-orange-700 dark:bg-slate-800/80 dark:hover:bg-orange-700 dark:hover:text-orange-200 cursor-pointer border"
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
        <HideRepoButton owner={meta.owner} repo={meta.name} />
      </div>
      <header
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {hasLanguage && (
              <div className="flex items-center gap-2">
                <LanguageIcon
                  language={meta.primaryLanguage!}
                  className="h-5 w-5"
                />
              </div>
            )}
            {hasData && currentAnalysis?.techStack && (
                <TechStackDisplay 
                  techStack={currentAnalysis.techStack}
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
        <div className="flex flex-col gap-2">
          <OwnershipBadge 
            isFork={meta.isFork} 
            isOwnedByUser={meta.isOwnedByUser ?? false}
            ownerUsername={meta.ownerUsername}
          />
        </div>
      </header>

      {(showPackages ||
        (isExpanded && summaryText) ||
        showActions ||
        (hasData && currentAnalysis?.techStack)
      ) && (
        <>
          <section>
            <div className="space-y-4">
              {showPackages && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tech Stack (Legacy)
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

              {isExpanded && summaryText && 
                <EditableText
                  value={summaryText}
                  onSave={handleSaveSummary}
                  className="leading-relaxed text-slate-700 dark:text-slate-200 mt-2 text-sm"
                  placeholder="No summary available. Double-click to add one."
                />
              }
            </div>
          </section>
        </>
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

      {isExpanded && (
        <div className="mt-4 overflow-auto rounded border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <pre className="text-xs text-slate-600 dark:text-slate-300 max-h-96 break-words whitespace-pre-wrap">
            {JSON.stringify(
              {
                meta,
                analysis: currentAnalysis,
                hasData,
                processingStatus,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </article>
  );
};
