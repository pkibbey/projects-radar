# GitHub Copilot CLI Integration

## Overview

The projects dashboard now uses **GitHub Copilot CLI** to generate AI-powered repository analysis. Instead of relying on markdown document contents, Copilot analyzes the full repository context including code structure, dependencies, architecture patterns, and more.

## How It Works

1. **Repository Cloning**: When you request AI analysis, the system clones the repository to a temporary directory using your GitHub token
2. **Copilot Analysis**: The GitHub Copilot CLI (`gh copilot`) analyzes the entire codebase with full context
3. **Structured Output**: Copilot returns a JSON response with:
   - **Summary**: 2-3 sentence description of what the project does
   - **Insights**: Key technical observations about architecture, frameworks, and code organization
   - **Actions**: Specific, actionable recommendations for improvements
4. **Cleanup**: The cloned repository is automatically removed after analysis

## Setup Instructions

### 1. Install GitHub CLI (if not already installed)

```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux
# See https://github.com/cli/cli#installation
```

### 2. Install GitHub Copilot Extension

```bash
gh extension install github/gh-copilot
```

Verify installation:
```bash
gh extension list | grep copilot
```

### 3. Authenticate with GitHub

```bash
gh auth login
```

Follow the prompts to authenticate. Make sure you have GitHub Copilot access enabled for your account.

### 4. Configure Environment Variables

Create or update `.env.local`:

```bash
# Required for cloning repos and Copilot analysis
GITHUB_TOKEN=ghp_your_token_here

# Optional: Override AI model for LM Studio fallback
AI_MODEL=your-model-name

# Optional: Override LM Studio URL
LM_STUDIO_URL=http://localhost:1234/v1
```

**Important**: Your `GITHUB_TOKEN` needs the `repo` scope to clone private repositories.

## Usage

### Generate Analysis for a Repository

1. Navigate to your dashboard at `http://localhost:3000`
2. Click on a repository card
3. Click the "Refresh Intelligence" button
4. The system will:
   - Clone the repository
   - Run Copilot analysis
   - Display the results
   - Clean up the temporary clone

### API Endpoint

You can also trigger analysis directly via API:

```bash
POST /api/repos/[owner]/[repo]/data
```

Example:
```bash
curl -X POST http://localhost:3000/api/repos/pkibbey/projects-dashboard/data
```

## Architecture

### New Files

- **`src/lib/repo-cloner.ts`**: Handles cloning repositories to temp directories and cleanup
- **`src/lib/copilot-analyzer.ts`**: Interfaces with GitHub Copilot CLI to generate analysis
- **`src/app/api/repos/[owner]/[repo]/data/route.ts`**: Updated to use Copilot instead of LM Studio

### Flow Diagram

```
User Request
    ↓
API Route (data/route.ts)
    ↓
Clone Repository (repo-cloner.ts)
    ↓
Analyze with Copilot (copilot-analyzer.ts)
    ↓
Store Analysis (db.ts)
    ↓
Cleanup Clone (repo-cloner.ts)
    ↓
Return Results
```

## Advantages Over Document-Based Analysis

### Before (Document-based)
- ✗ Only analyzed README and markdown files
- ✗ Limited to first 2000 characters of each document
- ✗ No insight into actual code structure
- ✗ Couldn't assess dependencies or frameworks

### After (Copilot CLI)
- ✓ Analyzes entire codebase structure
- ✓ Understands dependencies and frameworks
- ✓ Identifies architecture patterns
- ✓ Provides code-aware recommendations
- ✓ Recognizes tech stack and best practices
- ✓ Full context understanding

## Fallback Mechanism

If Copilot CLI fails (not installed, not authenticated, or errors), the system returns a helpful error message with instructions:

```json
{
  "summary": "Repository owner/repo - Analysis unavailable via Copilot CLI",
  "insights": [
    {
      "title": "Copilot CLI analysis failed",
      "description": "Check logs for details"
    }
  ],
  "actions": [
    {
      "title": "Verify installation",
      "instruction": "Run: gh extension list | grep copilot"
    }
  ]
}
```

## Troubleshooting

### Copilot CLI not found
```bash
# Verify GitHub CLI is installed
gh --version

# Install Copilot extension
gh extension install github/gh-copilot
```

### Authentication errors
```bash
# Re-authenticate
gh auth login

# Verify authentication status
gh auth status
```

### Clone failures
- Ensure `GITHUB_TOKEN` is set in `.env.local`
- Verify the token has `repo` scope
- Check that you have access to the repository

### Slow analysis
- Copilot analyzes the full repository, which can take 10-30 seconds for larger projects
- The system uses shallow clones (`--depth 1`) to speed up the process
- Consider analyzing repositories during off-peak hours

## Alternative: LM Studio Fallback

If you prefer to use LM Studio instead of Copilot CLI, you can modify the API route to call `generateRepoAnalysis(bundle)` instead of `analyzeCopilotWithContext()`. The original LM Studio implementation is still available in `src/lib/ai.ts`.

## Future Enhancements

Potential improvements for this integration:

1. **Caching**: Store Copilot analysis results to avoid re-cloning on every request
2. **Parallel Processing**: Analyze multiple repositories concurrently
3. **Incremental Updates**: Only re-analyze if repository has changed since last analysis
4. **Custom Prompts**: Allow users to customize the analysis prompt per repository
5. **Metrics**: Track analysis time, success rate, and Copilot token usage
