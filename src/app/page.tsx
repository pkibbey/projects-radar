import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle, GitHubError } from "@/lib/github";
import {
  buildFallback,
  generateRepoAnalysis,
  loadCachedRepoAnalysis,
} from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import { RepoCard } from "@/components/repo-card";
import { ViewModeSwitcher } from "@/components/view-mode-switcher";
import { SortSelector, type SortKey } from "@/components/sort-selector";
import { cn } from "@/lib/utils";
import {
  DEFAULT_VIEW_MODE,
  isViewMode,
  type ViewMode,
} from "@/lib/view-modes";

export const revalidate = 60;

const gridLayoutByMode: Record<ViewMode, string> = {
  list: "grid-cols-1",
  compact: "grid-cols-1 sm:grid-cols-2",
  expanded: "grid-cols-1",
};

const gridGapByMode: Record<ViewMode, string> = {
  list: "gap-4",
  compact: "gap-5",
  expanded: "gap-8",
};

type DashboardContentProps = {
  viewMode: ViewMode;
  sortMode?: "name" | "stars" | "updated" | "completeness";
};

async function DashboardContent({ viewMode, sortMode }: DashboardContentProps) {
  const token = getGitHubToken();
  const generationTasks: Promise<void>[] = [];

  const loadResults = await Promise.all(
    projectConfig.map(async (entry) => {
      try {
        const bundle = await fetchRepositoryBundle(entry, token ?? undefined);
        const cachedAnalysis = loadCachedRepoAnalysis(bundle);

        if (!cachedAnalysis && token) {
          const task = generateRepoAnalysis(bundle, {
            entry,
            token,
          })
            .then(() => {
              console.info(
                `[ai] Generated project intelligence for ${entry.owner}/${entry.repo}.`,
              );
            })
            .catch((error) => {
              console.error(
                `[ai] Failed to generate project intelligence for ${entry.owner}/${entry.repo}.`,
                error,
              );
            });
          generationTasks.push(task);
        }

        const analysis =
          cachedAnalysis ??
          buildFallback(
            bundle,
            token
              ? "AI analysis is being generated. Refresh shortly to view new insights."
              : "Provide GITHUB_TOKEN and AI credentials to enable project intelligence generation.",
          );

        return { bundle, analysis };
      } catch (error) {
        if (error instanceof GitHubError) {
          return { error: `${entry.owner}/${entry.repo}: ${error.message}` };
        }
        return {
          error: `${entry.owner}/${entry.repo}: ${(error as Error).message}`,
        };
      }
    }),
  );

  const errors = loadResults.filter((result) => "error" in result) as Array<{
    error: string;
  }>;

  const projects = loadResults.filter(
    (result): result is { bundle: Awaited<ReturnType<typeof fetchRepositoryBundle>>; analysis: Awaited<ReturnType<typeof generateRepoAnalysis>> } =>
      "bundle" in result,
  );

  const sortedProjects = projects.slice().sort((a, b) => {
    if (sortMode === "stars") {
      return b.bundle.meta.stars - a.bundle.meta.stars;
    }
    if (sortMode === "updated") {
      return (
        new Date(b.bundle.meta.pushedAt).getTime() - new Date(a.bundle.meta.pushedAt).getTime()
      );
    }
    if (sortMode === "completeness") {
      const as = a.bundle.meta.completenessScore ?? 0;
      const bs = b.bundle.meta.completenessScore ?? 0;
      return bs - as;
    }
    // default name sort
    return a.bundle.meta.displayName.localeCompare(b.bundle.meta.displayName);
  });

  const navItems = sortedProjects.map(({ bundle }) => ({
    id: `${bundle.meta.owner}-${bundle.meta.name}`,
    label: bundle.meta.displayName,
  }));

  const aggregateStats = projects.reduce(
    (acc, { bundle }) => {
      const { stars, forks, openIssues, watchers, pushedAt, primaryLanguage } = bundle.meta;
      acc.stars += stars;
      acc.forks += forks;
      acc.issues += openIssues;
      acc.watchers += watchers;
      acc.latestPush = Math.max(acc.latestPush, new Date(pushedAt).getTime());
      if (primaryLanguage) {
        acc.languages.add(primaryLanguage);
      }
      return acc;
    },
    {
      stars: 0,
      forks: 0,
      issues: 0,
      watchers: 0,
      latestPush: 0,
      languages: new Set<string>(),
    },
  );

  const topLanguages = Array.from(aggregateStats.languages).slice(0, 3);
  const extraLanguageCount = aggregateStats.languages.size - topLanguages.length;
  const lastPushText = aggregateStats.latestPush
    ? formatDistanceToNow(aggregateStats.latestPush, { addSuffix: true })
    : null;

  if (generationTasks.length > 0) {
    void Promise.allSettled(generationTasks);
  }

  if (!projects.length) {
    return (
      <div className="mx-auto max-w-2xl text-center text-sm text-slate-600 dark:text-slate-300">
        <p className="font-medium">
          No repositories could be loaded. Configure `projectConfig` with at least one repository.
        </p>
        {errors.map((item) => (
          <p key={item.error} className="mt-2 text-xs text-rose-500 dark:text-rose-400">
            {item.error}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Some repositories failed to load
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {errors.map((item) => (
              <li key={item.error}>{item.error}</li>
            ))}
          </ul>
        </div>
      )}

      {navItems.length > 0 && (
        <nav
          aria-label="Repository shortcuts"
          className="sticky top-0 z-10 overflow-x-auto rounded-xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80"
        >
          <ol className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-1.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <section className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-200">
          {projects.length} repositories tracked
        </span>
        <span>⭐ {aggregateStats.stars.toLocaleString()} stars</span>
        <span>🍴 {aggregateStats.forks.toLocaleString()} forks</span>
        <span>🐞 {aggregateStats.issues.toLocaleString()} open issues</span>
        {aggregateStats.watchers > 0 && (
          <span>👀 {aggregateStats.watchers.toLocaleString()} watchers</span>
        )}
        {topLanguages.length > 0 && (
          <span>
            💻 Top languages: {topLanguages.join(", ")}
            {extraLanguageCount > 0 ? ` +${extraLanguageCount}` : ""}
          </span>
        )}
        {lastPushText && <span>⏱ Last push {lastPushText}</span>}
      </section>

      <div className={cn("grid", gridGapByMode[viewMode], gridLayoutByMode[viewMode])}>
        {sortedProjects.map(({ bundle, analysis }) => (
          <RepoCard
            key={`${bundle.meta.owner}/${bundle.meta.name}`}
            bundle={bundle}
            analysis={analysis}
            mode={viewMode}
            id={`${bundle.meta.owner}-${bundle.meta.name}`}
          />
        ))}
      </div>
    </div>
  );
}

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const rawView = Array.isArray(resolvedParams.view)
    ? resolvedParams.view[0]
    : resolvedParams.view;
  const rawSort = Array.isArray(resolvedParams.sort) ? resolvedParams.sort[0] : resolvedParams.sort;
  const sortMode = rawSort === "stars" || rawSort === "updated" || rawSort === "completeness" ? rawSort : "name";
  const viewMode = isViewMode(rawView) ? rawView : DEFAULT_VIEW_MODE;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-indigo-500">Project Radar</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            GitHub Project Intelligence
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Monitor repository health, review AI powered insights, and take guided actions to keep your projects on track.
          </p>
          {!process.env.GITHUB_TOKEN && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Set `GITHUB_TOKEN` to increase rate limits, access private repositories, and persist PROJECT_INTELLIGENCE.md updates.
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <SortSelector value={sortMode as SortKey} />
          <ViewModeSwitcher value={viewMode} />
        </div>
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading repositories…</p>}>
        <DashboardContent viewMode={viewMode} sortMode={sortMode as SortKey} />
      </Suspense>
    </div>
  );
}
