export type ProjectConfigEntry = {
  owner: string;
  repo: string;
  branch?: string;
  displayName?: string;
  fetchSourceCode?: boolean; // Optional: whether to fetch source code files for analysis (default: true)
  fetchDocuments?: boolean; // Optional: whether to fetch markdown files from the repo (legacy, default: false)
};

// Configuration for which source code files to fetch from repositories
// These are prioritized in order: source files first, then config files
// Set to empty array if you only want repo metadata without fetching files
export const DEFAULT_FILES = [
  // Config files (highest priority for understanding project setup)
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "next.config.js",
  "vite.config.ts",
  "vite.config.js",
  "webpack.config.js",
  "webpack.config.ts",
  "babel.config.js",
  "eslint.config.mjs",
  ".eslintrc.json",
  ".eslintrc.js",
  "prettier.config.js",
  "jest.config.js",
  "vitest.config.ts",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "pyproject.toml",
  ".python-version",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "mix.exs",
  "composer.json",
  ".nvmrc",
  ".node-version",
  
  // Entry point files (understand the application architecture)
  "src/index.ts",
  "src/index.tsx",
  "src/index.js",
  "src/index.jsx",
  "src/app.ts",
  "src/app.tsx",
  "src/app.js",
  "src/App.tsx",
  "src/App.ts",
  "src/App.js",
  "src/main.ts",
  "src/main.js",
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "app.ts",
  "app.tsx",
  "app.js",
  "main.ts",
  "main.js",
  
  // Layout and page structure (Next.js and frameworks)
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/pages/_app.tsx",
  "src/pages/index.tsx",
  
  // Core library structure
  "src/lib/index.ts",
  "src/utils/index.ts",
  "src/helpers/index.ts",
  "lib/index.ts",
  "utils/index.ts",
  
  // Component structure (for UI projects)
  "src/components/index.ts",
  "components/index.ts",
  
  // Documentation (fallback if available)
  "README.md",
  "ARCHITECTURE.md",
  "CONTRIBUTING.md",
] as const;
