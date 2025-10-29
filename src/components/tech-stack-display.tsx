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
  "React Testing Library",
  "React Icons",
  "Tailwind CSS",
  "Express",
  "Prisma",
  "MongoDB",
  "Astro",
  "Fastify",
  "Axios",
  "Redis",
  "AWS",
  "Vite",
  "Node Fetch",
  "Radix UI",
  "Lucide Icons",
  "PostCSS",
  "Turbopack",
  "Zod",
  "shadcn/ui",
  "SQLite",
  "date-fns",
  "dotenv",
  "Moment.js",
  "React Router",
  "Styled Components",
  "Framer Motion",
  "Zustand",
  "Lodash",
  "Redux",
  "Vercel",
  "TanStack Query",
  "Arduino",
  "Adafruit Libraries",
  "React Hook Form",
  "Sass",
  "Grunt",
  "WiFi (Arduino)",
  "Angular",
  "Chai",
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

  // Get all icon names that should be displayed
  const getIconName = (techName: string): string => {
    // Map tech names to their icon base names
    const iconMap: Record<string, string> = {
      "React": "React",
      "React Testing Library": "React",
      "React Icons": "React",
      "Radix UI": "React",
      "React Router": "React",
      "Styled Components": "React",
      "Framer Motion": "React",
      "Zustand": "Zustand",
      "Redux": "React",
      "TanStack Query": "React",
      "React Hook Form": "React",
      "shadcn/ui": "React",
      "Lucide Icons": "React",
      "JavaScript": "JavaScript",
      "date-fns": "JavaScript",
      "Moment.js": "JavaScript",
      "Lodash": "JavaScript",
      "TypeScript": "TypeScript",
      "Zod": "TypeScript",
      "Arduino": "Arduino",
      "WiFi (Arduino)": "Arduino",
      "Adafruit Libraries": "Arduino",
      "Node Fetch": "Node.js",
      "Turbopack": "Node.js",
      "dotenv": "Node.js",
    };
    return iconMap[techName] || techName;
  };

  // Collect unique icons
  const seenIcons = new Set<string>();
  const filteredItems: TechStack[] = [];

  categories.forEach((category) => {
    const items = techStack[category] || [];
    items.forEach((item) => {
      if (languageNames.has(item.name)) {
        const iconName = getIconName(item.name);
        if (!seenIcons.has(iconName)) {
          seenIcons.add(iconName);
          filteredItems.push(item);
        }
      } else {
        filteredItems.push(item);
      }
    });
  });

  return (
    <div className="flex flex-wrap gap-2">
      {filteredItems.map((item) => renderTechItem(item))}
    </div>
  );
};
