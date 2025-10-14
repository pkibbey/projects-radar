import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ExternalLink, Lightbulb } from "lucide-react";
import { projectConfig } from "@/config/projects";
import { fetchRepositoryBundle } from "@/lib/github";
import {
  buildFallback,
} from "@/lib/ai";
import { getGitHubToken } from "@/lib/env";
import { RepoStatusBadge } from "@/components/repo-status-badge";
import { RepoActionsList } from "@/components/repo-actions-list";

export const revalidate = 60;

export const generateStaticParams = () =>
  projectConfig.map((entry) => ({ owner: entry.owner, repo: entry.repo }));

type RepoPageProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

const formatNumber = (value: number) => value.toLocaleString();

const MarkdownPanel = ({
  path,
  content,
}: {
  path: string;
  content: string;
}) => (
  <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
      {path}
    </h2>
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  </section>
);

export default async function RepoPage({ params }: RepoPageProps) {
  const resolvedParams = await params;
  const entry = projectConfig.find(
    (item) =>
      item.owner === resolvedParams.owner && item.repo === resolvedParams.repo,
  );

  if (!entry) {
    notFound();
  }

  const token = getGitHubToken();
  const bundle = await fetchRepositoryBundle(entry, token ?? undefined);

  const analysis =
    buildFallback(
      bundle,
      token
        ? "AI analysis is being generated. Refresh shortly to view new insights."
        : "Provide GITHUB_TOKEN and AI credentials to enable project intelligence generation.",
    );
  const { meta, documents } = bundle;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-5 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <RepoStatusBadge status={meta.status} />
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {meta.displayName}
            </h1>
          </div>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {meta.description ?? "No description available."}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span>⭐ {formatNumber(meta.stars)} stars</span>
            <span>🍴 {formatNumber(meta.forks)} forks</span>
            <span>👀 {formatNumber(meta.watchers)} watchers</span>
            <span>🐞 {formatNumber(meta.openIssues)} open issues</span>
            <span>Branch: {meta.defaultBranch}</span>
          </div>
        </div>
        <Link
          href={meta.htmlUrl}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          View on GitHub
          <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <Lightbulb className="h-4 w-4" /> AI Summary
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {analysis.summary}
            </p>
            <ul className="mt-4 space-y-3">
              {analysis.insights.map((insight) => (
                <li
                  key={insight.title}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {insight.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {insight.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {documents.length > 0 ? (
            <div className="grid gap-6">
              {documents.map((doc) => (
                <MarkdownPanel key={doc.path} path={doc.path} content={doc.content} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No documentation files were found in the repository root. Add a README.md, PROJECT_ANALYSIS.md, or TODO.md to surface documentation here.
            </p>
          )}
        </div>

        <RepoActionsList actions={analysis.actions} />
      </section>
    </div>
  );
}
