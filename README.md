Projects Radar

Projects Radar is a web dashboard that analyzes and processes GitHub repositories to generate README content, screenshots, short descriptions, and tech-stack insights. The app provides a repository listing UI, queue management, and background workers that run AI and scanner jobs.

<!-- [Live Demo](https://...) -->

## Features

- **Repository discovery & sync:** Finds and syncs repositories by owner, with visibility and fork filters.
- **Batch generation:** Produce README files, screenshots, and short descriptions via API endpoints and background jobs.
- **AI-assisted analysis:** Uses OpenAI to summarize code, detect tech stacks, and generate short descriptions.
- **Queue & worker system:** Background processing with `bullmq` and Redis, plus a UI for queue status and controls.
- **Tech stack detection:** Scans repo files to infer frameworks, languages, and packages.
- **Repo controls:** UI actions to refresh, hide/unhide, and re-run analysis for individual repos.

## Getting Started

**Prerequisites**

- **Node.js:** 18+ recommended
- **Package manager:** `npm`, `pnpm`, or `yarn`
- **Redis:** Required for `bullmq` background queues
- **Optional:** Local SQLite (via `better-sqlite3`) for lightweight persistence
- **Env vars:** `GITHUB_TOKEN`, `OPENAI_API_KEY`, `REDIS_URL` (and any database path settings)

**Installation & Development**

1. Clone the repo and install dependencies:

   ```bash
   git clone <repo-url>
   cd projects-radar
   npm install
   ```

2. Create a `.env` with required keys (see Prerequisites).

3. Start the app (development):

   ```bash
   npm run dev
   ```

- Build for production: `npm run build`
- Start production server: `npm start`
- Clear queue utility: `npm run clear-queue`

## Project Structure

- **`src/app/`** — Next.js app routes and pages (UI and server API endpoints).
- **`src/components/`** — Reusable UI components such as `repo-card`, `tech-stack-display`, and form controls used across the dashboard.
- **`src/lib/`** — Core backend logic:
  - `github.ts` — GitHub API helpers and repo sync logic
  - `repo-cloner.ts` — Clones repos locally for analysis
  - `screenshot-generator.ts` — Produces screenshots of repository content
  - `source-code-analyzer.ts` & `tech-stack-detection.ts` — Analyze code to detect stack and produce insights
  - `ai.ts` & `copilot-analyzer.ts` — OpenAI wrappers and analysis orchestration
  - `bullmq-worker.ts` & `bullmq.ts` — Queue processing and worker setup
- **`src/app/api/`** — Server routes that trigger batch jobs (generate READMEs, screenshots, descriptions) and queue endpoints.
- **`src/scripts/`** — Convenience scripts (e.g., `clear-queue.ts`).
- **`src/types/`** — Shared TypeScript types.

Key UI pages include `queue-management`, `queue-status`, and per-repo views under `src/app/repos`.

## Tech Stack

- **Next.js** ^16 — React framework for server rendering and routing
- **React** 19.2 — UI library
- **TypeScript** ^5.9 — Static typing
- **Tailwind CSS** ^4.1 — Utility-first styling
- **BullMQ** ^5.10 — Background job queue
- **Redis** ^4.7 — Queue broker used by BullMQ
- **better-sqlite3** ^12 — Lightweight local persistence
- **OpenAI** ^6.7 — AI-assisted content generation
- **Playwright** ^1.56 — Used for screenshot generation/testing

For a complete dependency list and exact versions, see `package.json`.

If you'd like, I can also add a short Quick Start section with example `.env` entries or adjust wording for a public README.
**projects-dashboard**

A lightweight web dashboard for indexing and managing GitHub repositories with automated README/screenshot generation, tech-stack detection, and queue-based batch operations. The UI shows repository cards, status badges and batch controls to refresh, hide, or generate content for selected repos.

<!-- [Live Demo](https://...) -->

Features
- **Repository Indexing:** Scans and lists repositories with status and visibility controls.
- **Batch Automation:** Generate README, screenshots, and short descriptions via queued jobs.
- **AI-assisted Content:** Uses OpenAI to suggest or generate README content and short descriptions.
- **Tech-stack Detection:** Detects languages and frameworks from repository contents.
- **Queue Management:** Background processing with `bullmq` and a worker for long-running tasks.
- **Quick Actions:** Single-repo actions like screenshot, short description, and README generation.

Getting Started
Prerequisites
- **Node:** 18+ (recommended for Next.js 16 and tooling)
- **Package manager:** `npm`, `pnpm` or `yarn`
- **Redis:** running locally or accessible for `bullmq` queue processing

Installation & Development
1. Clone the repo

```bash
git clone <repo-url>
cd projects-dashboard
```

2. Install dependencies

```bash
npm install
# or: pnpm install
```

3. Run development environment

```bash
npm run dev
```

Notes on scripts
- `npm run dev` — runs Next dev server and starts the `bullmq` worker (`src/lib/bullmq-worker.ts`).
- `npm run build` / `npm start` — build and run production Next server.
- `npm run clear-queue` — helper script to clear queued jobs.

Project Structure
- **App & UI:** [src/app/page.tsx](src/app/page.tsx), [src/app/layout.tsx](src/app/layout.tsx) — top-level routing and layout.
- **Components:** [src/components/repo-card.tsx](src/components/repo-card.tsx), [src/components/repo-actions-list.tsx](src/components/repo-actions-list.tsx), UI primitives under [src/components/ui](src/components/ui).
- **API routes:** `src/app/api/*` (e.g., [src/app/api/batch/generate-readmes/route.ts](src/app/api/batch/generate-readmes/route.ts)) — endpoints for queueing and repo operations.
- **Background worker & queue:** [src/lib/bullmq-worker.ts](src/lib/bullmq-worker.ts), [src/lib/bullmq.ts](src/lib/bullmq.ts) — job processing and queue helpers.
- **Repo tools & analysis:** [src/lib/github.ts](src/lib/github.ts), [src/lib/repo-cloner.ts](src/lib/repo-cloner.ts), [src/lib/source-code-analyzer.ts](src/lib/source-code-analyzer.ts), [src/lib/tech-stack-detection.ts](src/lib/tech-stack-detection.ts).
- **Content generators:** [src/lib/screenshot-generator.ts](src/lib/screenshot-generator.ts), [src/lib/copilot-analyzer.ts](src/lib/copilot-analyzer.ts), [src/app/api/batch/generate-screenshots/route.ts](src/app/api/batch/generate-screenshots/route.ts).
- **Scripts:** `src/scripts/clear-queue.ts` — utility scripts for maintenance.

Tech Stack
- **Next.js 16** (^16.0.0) — React server + routing.
- **React 19** (19.2.0) — UI library.
- **TypeScript** (^5.9) — static typing.
- **Tailwind CSS** (^4.1) — utility-first styling.
- **bullmq** (^5.10.0) + **Redis** (^4.x) — job queue and background processing.
- **OpenAI** (^6.7.0) — AI-powered README/description generation.
- **better-sqlite3** (^12.4.1) — local data storage for light persistence.
- **Playwright** (^1.56.1) — headless browser for screenshot generation.

Important files to review
- [package.json](package.json) — scripts and dependency versions.
- [src/lib/bullmq-worker.ts](src/lib/bullmq-worker.ts) — worker entry used in development.
- [src/app/api/batch/generate-readmes/route.ts](src/app/api/batch/generate-readmes/route.ts) — example API that enqueues README generation.

If you'd like, I can: run the dev server locally, verify environment variables, or add a short README badge and usage examples for the API endpoints.
# Projects Dashboard

A GitHub repository for projects-dashboard



## About

This project provides functionality for managing and analyzing repository data. Whether you're looking to track your repositories, analyze their performance, or generate documentation, this tool is designed to help.

## Features

- ✨ Repository management
- 🚀 Automated workflows
- 📊 Data analysis
- 🔧 Easy configuration
- 📝 Comprehensive documentation
- 🧠 Built with TypeScript

## Getting Started

### Prerequisites

- Git
- Node.js (v14 or higher) or your project's required runtime
- Your system's package manager (npm, yarn, pnpm, or bun)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pkibbey/projects-dashboard.git
   cd projects-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure your environment:
   Create a `.env.local` file with any required environment variables.

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Usage

[Add usage examples and instructions here]

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on [GitHub Issues](https://github.com/pkibbey/projects-dashboard/issues).

---

**Repository:** [pkibbey/projects-dashboard](https://github.com/pkibbey/projects-dashboard)

Generated with ❤️
