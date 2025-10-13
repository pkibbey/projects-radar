import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle, GitHubError } from "@/lib/github";
import { generateRepoAnalysis } from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import { RepoCard } from "@/components/repo-card";

export const revalidate = 60;

const DashboardContent = async () => {
  const token = getGitHubToken();
  const loadResults = await Promise.all(
    projectConfig.map(async (entry) => {
      try {
        const bundle = await fetchRepositoryBundle(entry, token ?? undefined);
        const analysis = await generateRepoAnalysis(bundle, {
          entry,
          token,
        });
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
    <div className="grid gap-6">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map(({ bundle, analysis }) => (
          <RepoCard key={`${bundle.meta.owner}/${bundle.meta.name}`} bundle={bundle} analysis={analysis} />
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
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
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading repositories…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
