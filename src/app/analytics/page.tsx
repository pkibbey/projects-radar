"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TechCategory } from "@/lib/tech-stack-detection";
import { getCategoryLabel, getCategoryColor } from "@/lib/tech-stack-detection";
import { Badge } from "@/components/ui/badge";

type TechUsageStats = {
  name: string;
  category: TechCategory;
  count: number;
  projects: string[];
};

export default function TechTrendsPage() {
  const [stats, setStats] = useState<TechUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"usage" | "name">("usage");
  const [filterCategory, setFilterCategory] = useState<TechCategory | "all">("all");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/analytics/tech-stack");
        
        if (!response.ok) {
          throw new Error("Failed to fetch tech stack analytics");
        }

        const data = await response.json();
        setStats(data.stats || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const filteredStats = filterCategory === "all" 
    ? stats 
    : stats.filter(s => s.category === filterCategory);

  const sortedStats = [...filteredStats].sort((a, b) => {
    if (sortBy === "usage") {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });

  const categories: TechCategory[] = ["frontend", "backend", "database", "devops", "testing", "build", "utility"];

  const totalProjects = new Set(stats.flatMap(s => s.projects)).size;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading tech stack analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-slate-900 dark:text-slate-100">Error: {error}</p>
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="mb-4 inline-flex items-center text-blue-600 hover:underline dark:text-blue-400">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Technology Trends</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Analyze tool usage across {totalProjects} projects
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tools Detected</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Projects</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{totalProjects}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Tools per Project</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {(stats.reduce((sum, s) => sum + s.count, 0) / totalProjects).toFixed(1)}
            </p>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TechCategory | "all")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "usage" | "name")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="usage">Most Used</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Tech Stack Grid */}
        {sortedStats.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">No technologies found. Generate data for your projects to see analytics.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedStats.map((tech) => {
              const percentage = ((tech.count / totalProjects) * 100).toFixed(0);
              return (
                <div
                  key={`${tech.category}-${tech.name}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {tech.name}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={`mt-2 ${getCategoryColor(tech.category)}`}
                      >
                        {getCategoryLabel(tech.category)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {tech.count}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {percentage}% of projects
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Used In Projects */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Used in:
                    </p>
                    <div className="max-h-24 overflow-y-auto">
                      <ul className="space-y-1">
                        {tech.projects.slice(0, 5).map((project) => (
                          <li key={project} className="text-xs text-slate-500 dark:text-slate-400">
                            • {project}
                          </li>
                        ))}
                        {tech.projects.length > 5 && (
                          <li className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            + {tech.projects.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category Breakdown */}
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">By Category</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const categoryStats = stats.filter(s => s.category === category);
              const totalCount = categoryStats.reduce((sum, s) => sum + s.count, 0);
              
              return (
                <div
                  key={category}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {categoryStats.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tools detected
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {totalCount} total uses
                    </p>
                  </div>
                  
                  {/* Top 3 tools in category */}
                  {categoryStats.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        Top Tools:
                      </p>
                      <div className="space-y-1">
                        {categoryStats
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 3)
                          .map((tech) => (
                            <div key={tech.name} className="flex items-center justify-between">
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {tech.name}
                              </span>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {tech.count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
