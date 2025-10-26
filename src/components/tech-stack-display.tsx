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
    "testing",
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
    <div className="flex gap-2">
      {categories.map((category) => {
        const items = techStack[category] || [];

        if (items.length === 0 && !showEmptyCategories) {
          return null;
        }

        return (
          <div className="flex flex-wrap gap-2" key={category}>
            {items.map(renderTechItem)}
            {items.length === 0 && (
              <span className="text-xs text-slate-400">None detected</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
