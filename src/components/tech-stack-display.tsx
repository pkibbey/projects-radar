"use client";

import { Badge } from "@/components/ui/badge";
import { 
  getCategoryColor,
  type TechCategory,
  type TechStack 
} from "@/lib/tech-stack-detection";
import type { TechStackInfo } from "@/lib/tech-stack-detection";

type TechStackDisplayProps = {
  techStack: TechStackInfo;
};

export const TechStackDisplay = ({
  techStack,
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
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const items = techStack[category] || [];

        if (items.length === 0) {
          return null;
        }

        return items.map(renderTechItem);
      })}
    </div>
  );
};
