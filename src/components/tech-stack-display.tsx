"use client";

import { Badge } from "@/components/ui/badge";
import { 
  getCategoryLabel, 
  getCategoryColor,
  type TechCategory,
  type TechStack 
} from "@/lib/tech-stack-detection";
import type { TechStackInfo } from "@/lib/tech-stack-detection";

type TechStackDisplayProps = {
  techStack: TechStackInfo;
  showEmptyCategories?: boolean;
};

export const TechStackDisplay = ({
  techStack,
  showEmptyCategories = false,
}: TechStackDisplayProps) => {
  const categories: TechCategory[] = [
    "frontend",
    "backend", 
    "database",
    "devops",
    "testing",
    "build",
    "utility",
  ];

  const renderTechItem = (tech: TechStack) => (
    <Badge 
      key={`${tech.category}-${tech.name}`}
      variant="secondary"
      className={`cursor-default ${getCategoryColor(tech.category)}`}
      title={tech.type ? `${tech.name} (${tech.type})` : tech.name}
    >
      {tech.name}
    </Badge>
  );

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = techStack[category] || [];

        if (items.length === 0 && !showEmptyCategories) {
          return null;
        }

        return (
          <div key={category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {getCategoryLabel(category)} {items.length > 0 && `(${items.length})`}
            </h3>
            <div className="flex flex-wrap gap-2">
              {items.map(renderTechItem)}
              {items.length === 0 && (
                <span className="text-xs text-slate-400">None detected</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
