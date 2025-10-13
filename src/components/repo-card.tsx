import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Lightbulb, ListChecks } from "lucide-react";
import { RepositoryBundle } from "@/lib/github";
import { RepoAnalysis } from "@/lib/ai";
import { RepoStatusBadge } from "@/components/repo-status-badge";
import { RepoActionsList } from "@/components/repo-actions-list";

export type RepoCardProps = {
  bundle: RepositoryBundle;
  analysis: RepoAnalysis;
};

export const RepoCard = ({ bundle, analysis }: RepoCardProps) => {
  const { meta } = bundle;
  const lastUpdatedText = formatDistanceToNow(new Date(meta.pushedAt), {
    addSuffix: true,
  });

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RepoStatusBadge status={meta.status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Updated {lastUpdatedText}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {meta.displayName}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {meta.description ?? "No description provided."}
          </p>
        </div>
        <Link
          href={`/repos/${meta.owner}/${meta.name}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          View details
          <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span>⭐ {meta.stars.toLocaleString()} stars</span>
            <span>🍴 {meta.forks.toLocaleString()} forks</span>
            <span>👀 {meta.watchers.toLocaleString()} watchers</span>
            <span>🐞 {meta.openIssues.toLocaleString()} open issues</span>
            {meta.primaryLanguage && <span>💻 {meta.primaryLanguage}</span>}
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <Lightbulb className="h-4 w-4" /> AI Summary
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {analysis.summary}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <ListChecks className="h-4 w-4" /> Key insights
            </h3>
            <ul className="grid gap-2 text-sm text-slate-700 dark:text-slate-200">
              {analysis.insights.map((insight) => (
                <li
                  key={insight.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {insight.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <RepoActionsList actions={analysis.actions} />
      </section>

      {meta.topics.length > 0 && (
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
    </article>
  );
};
