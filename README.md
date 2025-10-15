## Project overview

Project Radar is a Next.js dashboard that aggregates GitHub repositories, highlights project health signals, and produces AI generated insights and guided action plans. Each repository card surfaces:

- live metadata (stars, forks, open issues, recent activity)
- AI summaries and observations derived from root documentation files (README, PROJECT_ANALYSIS, TODO)
- actionable checklists you can copy into your workflow

## Prerequisites

- Node.js 18.18 or later
- npm 9 or later (ships with Node)
- A GitHub personal access token (required for Copilot analysis)
- GitHub Copilot CLI (`gh copilot`) installed and authenticated
- *(Alternative)* A local LM Studio instance exposing an OpenAI-compatible server

## Quick start

1. Install dependencies:

	```bash
	npm install
	```

2. Copy the environment template and update values:

        ```bash
        cp .env.local.example .env.local
        ```

        - `GITHUB_TOKEN` (required for Copilot): enables repository cloning, higher rate limits, access to private repositories, and Copilot CLI analysis. Generate a token with `repo` scope at https://github.com/settings/tokens
        - `AI_MODEL` (optional): override the default model served by LM Studio.
        - `LM_STUDIO_URL` (optional): override the base URL for LM Studio. Defaults to `http://localhost:1234/v1`.3. Define the repositories you want to monitor by editing `src/config/projects.ts`.

4. Launch the development server:

	```bash
	npm run dev
	```

5. Open [http://localhost:3000](http://localhost:3000) to explore the dashboard.

## Configuration

- Repository list: edit `projectConfig` inside `src/config/projects.ts`. Each entry accepts `owner`, `repo`, optional `branch`, and optional `displayName`.
- Documentation files: by default the dashboard looks for `README.md`, `PROJECT_ANALYSIS.md`, `TODO.md`, and `PROJECT.md` in the repository root. Update `DEFAULT_FILES` in the same file to customize.
- AI Analysis: The dashboard now uses **GitHub Copilot CLI** to generate AI insights by analyzing the full repository context (code structure, dependencies, patterns). To enable:
  1. Install the GitHub CLI: `brew install gh` (macOS) or see https://cli.github.com
  2. Install Copilot extension: `gh extension install github/gh-copilot`
  3. Authenticate: `gh auth login` and ensure you have Copilot access
  4. Set `GITHUB_TOKEN` in `.env.local` for repository cloning
- Alternative AI provider: LM Studio is still supported as a fallback. Ensure LM Studio exposes an OpenAI-compatible server (default `http://localhost:1234/v1`). Override `AI_MODEL` or `LM_STUDIO_URL` as needed.

## Available scripts

```bash
npm run dev     # start the Next.js dev server
npm run build   # build production assets
npm run start   # start the production server
npm run lint    # run ESLint
```

## Deployment notes

The app is a standard Next.js App Router project. Deploy to Vercel or any Node-capable platform. Remember to configure the environment variables in your hosting provider so GitHub integration and LM Studio connectivity continue to function.
