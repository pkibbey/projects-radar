"use client";

import type { ProjectLearning } from "@/types/learning";
import { Badge } from "@/components/ui/badge";

type LearningInsightsDisplayProps = {
  learning: ProjectLearning;
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "learning-complete": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
  deprioritized: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
  overcomplicated: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  "shifted-focus": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  "on-hold": { bg: "bg-slate-100 dark:bg-slate-900/30", text: "text-slate-700 dark:text-slate-400" },
};

const STATUS_LABELS: Record<string, string> = {
  "learning-complete": "Learning Complete",
  deprioritized: "Deprioritized",
  overcomplicated: "Too Complex",
  "shifted-focus": "Shifted Focus",
  "on-hold": "On Hold",
};

export const LearningInsightsDisplay = ({
  learning,
}: LearningInsightsDisplayProps) => {
  const statusColors = learning.statusReason
    ? STATUS_BADGE_COLORS[learning.statusReason] || STATUS_BADGE_COLORS["on-hold"]
    : STATUS_BADGE_COLORS["on-hold"];

  const statusLabel = learning.statusReason
    ? STATUS_LABELS[learning.statusReason]
    : "Status Unknown";

  return (
    <section className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      {/* Header with Status */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Learning Insights
        </h3>
        {learning.statusReason && (
          <div
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {statusLabel}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Problem Statement */}
        {learning.problem && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Problem
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {learning.problem}
            </p>
          </div>
        )}

        {/* Architecture */}
        {learning.architecture && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Architecture & Design
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {learning.architecture}
            </p>
          </div>
        )}

        {/* Skills Used */}
        {learning.skillsUsed && learning.skillsUsed.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Skills & Technologies
            </h4>
            <div className="flex flex-wrap gap-2">
              {learning.skillsUsed.map((skill) => (
                <Badge key={skill} variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Learnings */}
        {learning.keyLearnings && learning.keyLearnings.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Key Learnings
            </h4>
            <ul className="space-y-1">
              {learning.keyLearnings.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lessons for Improvement */}
        {learning.lessonsForImprovement && learning.lessonsForImprovement.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Lessons for Improvement
            </h4>
            <ul className="space-y-1">
              {learning.lessonsForImprovement.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Time Invested */}
        {learning.timeInvested && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Time Invested:
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {learning.timeInvested}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
