import { Suspense } from "react";
import { type GitHubUserRepo } from "@/lib/github-user-repos";
import { getGitHubOwner } from "@/lib/env";
import db from "@/lib/db";
import type { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";
import type { RepoStatusRecord } from "@/lib/db";
import { RepoCard } from "@/components/repo-card";
import { SortSelector, type SortKey, type SortOrder } from "@/components/sort-selector";
import {
  DEFAULT_DATA_FILTER,
  isDataFilter,
  type DataFilter,
} from "@/lib/data-filters";
import { DEFAULT_FORK_FILTER, isForkFilter, type ForkFilter } from "@/lib/fork-filters";
import { OrderSelector } from "@/components/order-selector";
import { ForkFilterSelector } from "@/components/fork-filter-selector";
import { BatchGenerateButton } from "@/components/batch-generate-button";
import { RefreshRepositoriesButton } from "@/components/refresh-repositories-button";
import { UnhideAllReposButton } from "@/components/unhide-all-repos-button";
import { BatchGenerateShortDescriptionsButton } from "@/components/batch-generate-short-descriptions-button";
import { BatchGenerateReadmesButton } from "@/components/batch-generate-readmes-button";

export const dynamic = "force-dynamic";

type ProjectRow = {
  entry: GitHubUserRepo;
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  hasData: boolean;
  updatedAt?: string | null;
  processingStatus?: RepoStatusRecord | null;
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
    isFork: entry.isFork,
    archived: false,
    license: null,
    ownerUsername: entry.ownerUsername,
    isOwnedByUser: entry.isOwnedByUser,
  },
  documents: [],
});

const keyForEntry = (entry: GitHubUserRepo) => `${entry.owner.toLowerCase()}/${entry.repo.toLowerCase()}`;

type DashboardContentProps = {
  sortMode: SortKey;
  sortOrder: SortOrder;
  dataFilter: DataFilter;
  forkFilter: ForkFilter;
  repos?: GitHubUserRepo[];
  owner?: string;
};

async function DashboardContent({ sortMode, sortOrder, dataFilter, forkFilter, repos = [], owner = "" }: DashboardContentProps) {
  const records = await db.listRepoData();
  const recordMap = new Map(records.map((record) => [record.key, record]));

  // Fetch hidden repos
  const hiddenRepos = await db.getHiddenRepos();
  const hiddenReposSet = new Set(hiddenRepos);

  const projects: ProjectRow[] = repos
    .filter((entry) => !hiddenReposSet.has(keyForEntry(entry))) // Filter out hidden repos
    .map((entry) => {
      const record = recordMap.get(keyForEntry(entry)) ?? null;
      const bundle = record?.bundle ?? buildPlaceholderBundle(entry);
      return {
        entry,
        bundle,
        analysis: record?.analysis ?? null,
        hasData: Boolean(record),
        updatedAt: record?.updatedAt ?? null,
        processingStatus: null, // Will be fetched separately
      } satisfies ProjectRow;
    });

  // Fetch processing status for all repos
  const statusRecords = await db.getReposByStatuses(["pending", "processing", "completed", "failed"]);
  const statusMap = new Map(statusRecords.map((record) => [record.key, record]));

  // Update projects with their processing status
  const projectsWithStatus = projects.map((project) => ({
    ...project,
    processingStatus: statusMap.get(keyForEntry(project.entry)) ?? null,
  }));

  if (!projectsWithStatus.length) {
    return (
      <div className="mx-auto max-w-2xl text-center text-sm text-slate-600 dark:text-slate-300">
        <p className="font-medium">
          No repositories loaded. Click "Load Repos" to fetch your repositories from GitHub.
        </p>
      </div>
    );
  }

  const filteredProjects = projectsWithStatus.filter((project) => {
    // Apply data filter
    if (dataFilter === "with-data") {
      if (!project.hasData) return false;
    }
    if (dataFilter === "without-data") {
      if (project.hasData) return false;
    }

    // Apply fork filter
    if (forkFilter === "with-forks") {
      if (!project.entry.isFork) return false;
    }
    if (forkFilter === "without-forks") {
      if (project.entry.isFork) return false;
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
      acc.selectedCount += 1;
      return acc;
    },
    {
      forks: 0,
      issues: 0,
      watchers: 0,
      latestPush: 0,
      languages: new Set<string>(),
      selectedCount: 0,
    },
  );

  const topLanguages = Array.from(aggregateStats.languages).slice(0, 3);
  const extraLanguageCount = aggregateStats.languages.size - topLanguages.length;
  const selectedCount = aggregateStats.selectedCount;
  const totalProjects = projectsWithStatus.length;
  const showingAllProjects = dataFilter === "all";

  // Count repos by processing status
  const processingCount = projectsWithStatus.filter((p) => p.processingStatus?.status === "processing").length;
  const queuedCount = projectsWithStatus.filter((p) => p.processingStatus?.status === "pending").length;
  const failedCount = projectsWithStatus.filter((p) => p.processingStatus?.status === "failed").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-200">
          {showingAllProjects
            ? `${totalProjects} repositories from ${owner}`
            : `Showing ${filteredProjects.length} of ${totalProjects} repositories from ${owner}`}
        </span>
        {selectedCount > 0 && <span>📦 {selectedCount} selected</span>}
        {processingCount > 0 && <span>⚙️ {processingCount} analyzing</span>}
        {queuedCount > 0 && <span>📋 {queuedCount} queued</span>}
        {failedCount > 0 && <span>❌ {failedCount} failed</span>}
        {selectedCount > 0 && (
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
              processingStatus={project.processingStatus ?? undefined}
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
  const rawForkFilter = Array.isArray(resolvedParams.fork)
    ? resolvedParams.fork[0]
    : resolvedParams.fork;
  
  const sortMode: SortKey = rawSort === "updated" || rawSort === "completeness" ? rawSort : "name";
  const dataFilter = isDataFilter(rawDataFilter) ? rawDataFilter : DEFAULT_DATA_FILTER;
  const forkFilter = isForkFilter(rawForkFilter) ? rawForkFilter : DEFAULT_FORK_FILTER;
  const sortOrder: SortOrder = rawOrder === "desc" ? "desc" : "asc";

  const owner = getGitHubOwner();
  
  // Load the repository list that was fetched via the button
  const fetchedRepos = await db.getFetchedRepositories();

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
          <SortSelector value={sortMode} />
          <OrderSelector order={sortOrder} />
          <ForkFilterSelector value={forkFilter} />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <RefreshRepositoriesButton />
          <UnhideAllReposButton forkFilter={forkFilter} repos={fetchedRepos} />
          <BatchGenerateButton dataFilter={dataFilter} forkFilter={forkFilter} repos={fetchedRepos} />
          <BatchGenerateShortDescriptionsButton dataFilter={dataFilter} forkFilter={forkFilter} repos={fetchedRepos} />
          <BatchGenerateReadmesButton dataFilter={dataFilter} forkFilter={forkFilter} repos={fetchedRepos} />
        </div>
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading repositories…</p>}>
        <DashboardContent sortMode={sortMode} sortOrder={sortOrder} dataFilter={dataFilter} forkFilter={forkFilter} repos={fetchedRepos} owner={owner} />
      </Suspense>
    </div>
  );
}
