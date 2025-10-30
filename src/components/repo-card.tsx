"use client";

import Link from "next/link";
import { useState } from "react";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import type { RepoStatusRecord, ProjectLearning } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { HideRepoButton } from "@/components/hide-repo-button";
import { EditableText } from "@/components/editable-text";
import { TechStackDisplay } from "@/components/tech-stack-display";
import { ExternalLinkButton } from "./external-link-button";
import { ShowInfoButton } from "./show-info-button";
import { AddLearningButton } from "@/components/add-learning-button";
import { LearningInsightsDisplay } from "@/components/learning-insights-display";
import { SingleScreenshotButton } from "@/components/single-screenshot-button";
import { SingleReadmeButton } from "@/components/single-readme-button";
import { SingleShortDescriptionButton } from "@/components/single-short-description-button";

type RepoCardProps = {
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  hasData: boolean;
  id?: string;
  processingStatus?: RepoStatusRecord;
  learning?: ProjectLearning | null;
};

export const RepoCard = ({
  bundle,
  analysis,
  hasData,
  id,
  processingStatus,
  learning,
}: RepoCardProps) => {
  const { meta } = bundle;
  const [currentSummary, setCurrentSummary] = useState(analysis?.summary ?? "");
  const [currentAnalysis] = useState(analysis);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLearning, setCurrentLearning] = useState<ProjectLearning | null>(
    learning ?? null
  );
    
  const showActions = hasData;
  const showTopics = hasData && meta.topics.length > 0;
  const showPackages = hasData && (currentAnalysis?.packages?.length ?? 0) > 0;
  const packages = showPackages ? (currentAnalysis?.packages ?? []) : [];

  const cardSpacing = "gap-1 p-3";
  const descriptionTone = "text-sm";

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
      <header
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div className="space-y-1 w-full">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="flex gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                <Link href={`/repos/${meta.owner}/${meta.name}`}>
                  {meta.displayName}
                </Link>
                <ExternalLinkButton htmlUrl={meta.htmlUrl} />
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {hasData && currentAnalysis?.techStack && (
                  <TechStackDisplay 
                    techStack={currentAnalysis.techStack}
                  />
              )}
              <SingleShortDescriptionButton owner={meta.owner} repo={meta.name} />
              <SingleScreenshotButton owner={meta.owner} repo={meta.name} />
              <SingleReadmeButton owner={meta.owner} repo={meta.name} />
              <ShowInfoButton 
                isExpanded={isExpanded} 
                onToggle={() => setIsExpanded(!isExpanded)} 
              />
              <HideRepoButton owner={meta.owner} repo={meta.name} />
            </div>
          </div>
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

      {/* Learning Insights Section */}
      <section className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
        {currentLearning && (
          <LearningInsightsDisplay learning={currentLearning} />
        )}
        <AddLearningButton
          owner={meta.owner}
          repo={meta.name}
          initialData={currentLearning}
          onSave={(data) => setCurrentLearning(data)}
          onDelete={() => setCurrentLearning(null)}
        />
      </section>

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
