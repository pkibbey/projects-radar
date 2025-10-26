import { Suspense } from "react";
import { fetchUserRepositories, type GitHubUserRepo } from "@/lib/github-user-repos";
import { getGitHubOwner, getGitHubToken } from "@/lib/env";
import db from "@/lib/db";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import { RepoCard } from "@/components/repo-card";
import { SortSelector, type SortKey, type SortOrder } from "@/components/sort-selector";
import { DataFilterSelector } from "@/components/data-filter-selector";
import {
  DEFAULT_DATA_FILTER,
  isDataFilter,
  type DataFilter,
} from "@/lib/data-filters";
import { OrderSelector } from "@/components/order-selector";

export const dynamic = "force-dynamic";

type ProjectRow = {
  entry: GitHubUserRepo;
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  hasData: boolean;
  updatedAt?: string | null;
};

const buildPlaceholderBundle = (entry: GitHubUserRepo): RepositoryBundle => ({
  meta: {
    owner: entry.owner,
    name: entry.repo,
    displayName: entry.displayName ?? entry.repo,
    description: null,
    forks: 0,
    openIssues: 0,
    defaultBranch: "main",
    branch: "main",
    pushedAt: new Date().toISOString(),
    htmlUrl: `https://github.com/${entry.owner}/${entry.repo}`,
    primaryLanguage: null,
    status: "stale",
    topics: [],
    hasDiscussions: false,
    watchers: 0,
    isPrivate: false,
    isFork: false,
    archived: false,
    license: null,
  },
  documents: [],
});

const keyForEntry = (entry: GitHubUserRepo) => `${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}`;

type DashboardContentProps = {
  sortMode: SortKey;
  sortOrder: SortOrder;
  dataFilter: DataFilter;
};

async function DashboardContent({ sortMode, sortOrder, dataFilter }: DashboardContentProps) {
  const records = await db.listRepoData();
  const recordMap = new Map(records.map((record) => [record.key, record]));

  // Fetch all repositories for the configured GitHub owner
  const owner = getGitHubOwner();
  const token = getGitHubToken();
  const repos = await fetchUserRepositories(owner, token);

  const projects: ProjectRow[] = repos.map((entry) => {
    const record = recordMap.get(keyForEntry(entry)) ?? null;
    const bundle = record?.bundle ?? buildPlaceholderBundle(entry);
    return {
      entry,
      bundle,
      analysis: record?.analysis ?? null,
      hasData: Boolean(record),
      updatedAt: record?.updatedAt ?? null,
    } satisfies ProjectRow;
  });

  if (!projects.length) {
    return (
      <div className="mx-auto max-w-2xl text-center text-sm text-slate-600 dark:text-slate-300">
        <p className="font-medium">
          No repositories found. Set `GITHUB_OWNER` in your environment to get started.
        </p>
      </div>
    );
  }

  const filteredProjects = projects.filter((project) => {
    if (dataFilter === "with-data") {
      return project.hasData;
    }
    if (dataFilter === "without-data") {
      return !project.hasData;
    }
    return true;
  });

  const sortedProjects = filteredProjects.slice().sort((a, b) => {
    let compareResult = 0;
    
    if (sortMode === "updated") {
      compareResult = new Date(b.bundle.meta.pushedAt).getTime() - new Date(a.bundle.meta.pushedAt).getTime();
    } else if (sortMode === "completeness") {
      const as = a.bundle.meta.completenessScore ?? 0;
      const bs = b.bundle.meta.completenessScore ?? 0;
      compareResult = bs - as;
    } else {
      compareResult = a.bundle.meta.displayName.localeCompare(b.bundle.meta.displayName);
    }
    
    return sortOrder === "desc" ? -compareResult : compareResult;
  });

  const aggregateStats = filteredProjects.reduce(
    (acc, project) => {
      if (!project.hasData) {
        return acc;
      }

      const { forks, openIssues, watchers, pushedAt, primaryLanguage } = project.bundle.meta;
      acc.forks += forks;
      acc.issues += openIssues;
      acc.watchers += watchers;
      acc.latestPush = Math.max(acc.latestPush, new Date(pushedAt).getTime());
      if (primaryLanguage) {
        acc.languages.add(primaryLanguage);
      }
      acc.cachedCount += 1;
      return acc;
    },
    {
      forks: 0,
      issues: 0,
      watchers: 0,
      latestPush: 0,
      languages: new Set<string>(),
      cachedCount: 0,
    },
  );

  const topLanguages = Array.from(aggregateStats.languages).slice(0, 3);
  const extraLanguageCount = aggregateStats.languages.size - topLanguages.length;
  const cachedCount = aggregateStats.cachedCount;
  const totalProjects = projects.length;
  const showingAllProjects = dataFilter === "all";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-200">
          {showingAllProjects
            ? `${totalProjects} repositories from ${owner}`
            : `Showing ${filteredProjects.length} of ${totalProjects} repositories from ${owner}`}
        </span>
        {cachedCount > 0 && <span>📦 {cachedCount} cached</span>}
        {cachedCount > 0 && (
          <>
            {topLanguages.length > 0 && (
              <span>
                💻 Top languages: {topLanguages.join(", ")}
                {extraLanguageCount > 0 ? ` +${extraLanguageCount}` : ""}
              </span>
            )}
          </>
        )}
      </section>

      {sortedProjects.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No repositories match this filter.
        </p>
      ) : (
        <div className="grid gap-4">
          {sortedProjects.map((project) => (
            <RepoCard
              key={`${project.bundle.meta.owner}/${project.bundle.meta.name}`}
              bundle={project.bundle}
              analysis={project.analysis}
              hasData={project.hasData}
              lastGeneratedAt={project.updatedAt ?? undefined}
              id={`${project.bundle.meta.owner}-${project.bundle.meta.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedParams = searchParams ? await searchParams : {};  
  const rawSort = Array.isArray(resolvedParams.sort) ? resolvedParams.sort[0] : resolvedParams.sort;
  const rawDataFilter = Array.isArray(resolvedParams.data)
    ? resolvedParams.data[0]
    : resolvedParams.data;
  const rawOrder = Array.isArray(resolvedParams.order) ? resolvedParams.order[0] : resolvedParams.order;
  
  const sortMode: SortKey = rawSort === "updated" || rawSort === "completeness" ? rawSort : "name";
  const dataFilter = isDataFilter(rawDataFilter) ? rawDataFilter : DEFAULT_DATA_FILTER;
  const sortOrder: SortOrder = rawOrder === "desc" ? "desc" : "asc";

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4">
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
              Set `GITHUB_TOKEN` to increase rate limits and access private repositories.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <DataFilterSelector value={dataFilter} />
          <SortSelector value={sortMode} />
          <OrderSelector order={sortOrder} />
        </div>
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading repositories…</p>}>
        <DashboardContent sortMode={sortMode} sortOrder={sortOrder} dataFilter={dataFilter} />
      </Suspense>
    </div>
  );
}
