"use client";

import { Badge } from "@/components/ui/badge";
import { LanguageIcon } from "@/components/language-icon";
import { 
  getCategoryColor,
  type TechCategory,
  type TechStack 
} from "@/lib/tech-stack-detection";
import type { TechStackInfo } from "@/lib/tech-stack-detection";

type TechStackDisplayProps = {
  techStack: TechStackInfo;
};

const languageNames = new Set([
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "C++",
  "C",
  "C#",
  "Swift",
  "Kotlin",
  "Ruby",
  "PHP",
  "HTML",
  "CSS",
  "React",
  "Vue",
  "Svelte",
  "Jest",
  "Next.js",
  "ESLint",
  "Supabase",
]);

export const TechStackDisplay = ({
  techStack,
}: TechStackDisplayProps) => {
  const categories: TechCategory[] = [
    "frontend",
    "backend", 
    "testing",
  ];

  const renderTechItem = (tech: TechStack) => {
    const isLanguage = languageNames.has(tech.name);
    const title = tech.type ? `${tech.name} (${tech.type})` : tech.name;

    if (isLanguage) {
      return (
        <div
          key={`${tech.category}-${tech.name}`}
          className="flex items-center justify-center"
          title={title}
        >
          <LanguageIcon language={tech.name} className="h-5 w-5" />
        </div>
      );
    }

    return (
      <Badge 
        key={`${tech.category}-${tech.name}`}
        variant="secondary"
        className={`cursor-default ${getCategoryColor(tech.category)}`}
        title={title}
      >
        {tech.name}
      </Badge>
    );
  };

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
