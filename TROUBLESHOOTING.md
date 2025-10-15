# Troubleshooting Copilot Analysis

## Issue: Analysis Taking Too Long

### What's Happening
The GitHub Copilot CLI can take 30-90 seconds to analyze a repository, especially for:
- Large repositories
- Complex codebases
- First-time analysis (Copilot is "thinking")

### Quick Fixes

#### 1. Use Quick Mode (Now Default)
The system now automatically tries a faster "quick mode" first:
- **Quick mode**: 15-30 seconds
- **Full mode**: 30-90 seconds (automatic fallback)

#### 2. Switch to LM Studio
If Copilot is too slow, use LM Studio instead:

**Via URL Parameter:**
```bash
POST /api/repos/owner/repo/data?useLmStudio=true
```

**Or update the code** in `src/app/api/repos/[owner]/[repo]/data/route.ts`:
```typescript
// Change this line:
const useLmStudio = url.searchParams.get('useLmStudio') === 'true';

// To always use LM Studio:
const useLmStudio = true;
```

#### 3. Check Logs
Watch your terminal for progress:
```
[Copilot] Starting analysis for owner/repo...
[Copilot] Executing command in /tmp/...
[Copilot] Received response (1234 chars)
[Copilot] Parsing response...
[Copilot] Success! Generated 3 insights and 3 actions
```

If stuck at "Executing command", Copilot is processing (be patient).

#### 4. Test Copilot CLI Directly
Verify Copilot is working:

```bash
cd /path/to/your/repo
gh copilot explain "What does this codebase do?"
```

If this hangs, the issue is with Copilot itself, not your app.

### Timeouts

The system has built-in timeouts:
- **Quick mode**: 30 seconds
- **Full mode**: 60 seconds

After timeout, you'll see:
```json
{
  "summary": "Repository owner/repo - Analysis timed out",
  "insights": [
    {"title": "Analysis timeout", "description": "..."}
  ]
}
```

## Issue: Copilot Not Working

### Check Installation
```bash
# 1. Verify GitHub CLI
gh --version

# 2. Verify Copilot extension
gh extension list | grep copilot

# 3. Test Copilot
gh copilot suggest "print hello world"
```

### Check Authentication
```bash
gh auth status
```

If not authenticated:
```bash
gh auth login
```

### Check Copilot Subscription
- Go to https://github.com/settings/copilot
- Ensure you have an active subscription
- GitHub Copilot CLI requires Copilot Individual or Business

## Performance Comparison

| Method | Speed | Context | Best For |
|--------|-------|---------|----------|
| **Quick Copilot** | 15-30s | Full repo | Fast results |
| **Full Copilot** | 30-90s | Full repo + detailed | Best insights |
| **LM Studio** | 5-10s | Docs only | Speed, local |

## Debug Mode

Add extra logging to `copilot-analyzer.ts`:

```typescript
console.log('[DEBUG] Command:', command);
console.log('[DEBUG] CWD:', repoPath);
console.log('[DEBUG] Timeout:', timeout);
```

## Common Issues

### "Command not found: gh"
```bash
brew install gh
```

### "Extension not found"
```bash
gh extension install github/gh-copilot
```

### "Not authenticated"
```bash
gh auth login
```

### "Repository too large"
- Try quick mode (now default)
- Or use LM Studio with `?useLmStudio=true`

### "Copilot subscription required"
- Sign up at https://github.com/copilot
- Or use LM Studio as alternative

## Recommended Setup

For best performance:

1. **Small repos (< 100 files)**: Use Copilot Quick Mode ✓
2. **Large repos (> 500 files)**: Use LM Studio or timeout quickly
3. **Private repos**: Ensure GITHUB_TOKEN has `repo` scope
4. **Public repos**: Copilot works great, no token needed for read

## Still Having Issues?

1. Check terminal logs for detailed error messages
2. Test Copilot CLI manually: `gh copilot suggest "test"`
3. Try LM Studio: Add `?useLmStudio=true` to your request
4. Check GitHub Copilot status: https://www.githubstatus.com

## Alternative: Disable Copilot Completely

If you prefer to always use LM Studio:

**Option 1: Environment Variable**
Add to `.env.local`:
```bash
USE_COPILOT=false
```

**Option 2: Code Change**
In `src/app/api/repos/[owner]/[repo]/data/route.ts`:
```typescript
const useLmStudio = true; // Always use LM Studio
```

This skips repository cloning and uses the original fast document-based analysis.
