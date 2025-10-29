import {
  SiTypescript,
  SiJavascript,
  SiPython,
  SiRust,
  SiGo,
  SiCplusplus,
  SiC,
  SiSharp,
  SiSwift,
  SiKotlin,
  SiRuby,
  SiPhp,
  SiHtml5,
  SiCss3,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiJest,
  SiNextdotjs,
  SiEslint,
  SiSupabase,
} from "react-icons/si";
import { Code } from "lucide-react";
import type { IconType } from "react-icons";

type LanguageIconProps = {
  language: string;
  className?: string;
};

const languageIconMap: Record<string, IconType> = {
  TypeScript: SiTypescript,
  JavaScript: SiJavascript,
  Python: SiPython,
  Rust: SiRust,
  Go: SiGo,
  "C++": SiCplusplus,
  C: SiC,
  "C#": SiSharp,
  Swift: SiSwift,
  Kotlin: SiKotlin,
  Ruby: SiRuby,
  PHP: SiPhp,
  HTML: SiHtml5,
  CSS: SiCss3,
  React: SiReact,
  Vue: SiVuedotjs,
  Svelte: SiSvelte,
  Jest: SiJest,
  "Next.js": SiNextdotjs,
  ESLint: SiEslint,
  Supabase: SiSupabase,
};

const languageColorMap: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Rust: "#ce412b",
  Go: "#00add8",
  "C++": "#00599c",
  C: "#555555",
  "C#": "#239120",
  Swift: "#fa7343",
  Kotlin: "#7f52ff",
  Ruby: "#cc342d",
  PHP: "#777bb4",
  HTML: "#e34c26",
  CSS: "#1572b6",
  React: "#61dafb",
  Vue: "#4fc08d",
  Svelte: "#ff3e00",
  Jest: "#15c213",
  "Next.js": "#000000",
  ESLint: "#4b32c3",
  Supabase: "#3ecf8e",
};

export const LanguageIcon = ({ language, className = "h-5 w-5" }: LanguageIconProps) => {
  const Icon = languageIconMap[language];
  const color = languageColorMap[language];

  if (Icon) {
    return (
      <span title={language}>
        <Icon className={className} style={{ color }} />
      </span>
    );
  }

  // Fallback to generic code icon
  return (
    <span title={language}>
      <Code className={className} />
    </span>
  );
};
