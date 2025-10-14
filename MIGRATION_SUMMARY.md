# Database-Only Data Flow Migration

## Overview
Successfully migrated from a hybrid markdown file + database approach to a pure NoSQL database-only data storage system.

## What Changed

### 1. Intelligence Endpoint (`/api/repos/[owner]/[repo]/intelligence`)
**Before:** Generated AI analysis but didn't persist it
**After:** Now calls `db.upsertRepoData()` to save both bundle and analysis to the database

**Impact:** AI-generated insights are now cached and reused instead of being discarded

### 2. Repository Detail Page (`/repos/[owner]/[repo]/page.tsx`)
**Before:** Always fetched fresh data from GitHub API on every page load
**After:** 
- Checks database first via `db.getRepoData()`
- Only fetches from GitHub as fallback if no cached data exists
- Displays cache timestamp with "Cached X ago" indicator
- Includes refresh button to update cached data

**Impact:** Much faster page loads, reduced GitHub API calls, better user experience

### 3. Removed Markdown Write Functionality
**Before:** Had `upsertRepositoryDocument()` function to write markdown files back to GitHub repos
**After:** Function completely removed from `lib/github.ts`

**Impact:** 
- Cleaner codebase
- No need for GitHub write permissions
- No accidental file modifications to repos

### 4. Configurable Document Fetching
**Before:** Always fetched 5 markdown files from every repo (including PROJECT_INTELLIGENCE.md)
**After:** 
- Removed `PROJECT_INTELLIGENCE.md` from DEFAULT_FILES list
- Added `fetchDocuments?: boolean` flag to ProjectConfigEntry type
- Documents only fetched if `fetchDocuments !== false` (default: true)

**Impact:** More flexible configuration, can disable document fetching per-repo if needed

### 5. Updated User Messages
**Before:** Mentioned "persist PROJECT_INTELLIGENCE.md updates"
**After:** Simplified to "increase rate limits and access private repositories"

**Impact:** More accurate messaging that reflects current implementation

## Data Flow (New)

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: View Repository / Click Refresh               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Check Database (db.getRepoData)                          │
│    ├─ Found? → Display cached data with timestamp           │
│    └─ Not found? → Continue to GitHub fetch                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch from GitHub (fetchRepositoryBundle)                │
│    ├─ Repo metadata (stars, forks, etc.)                    │
│    └─ Optional: README.md, TODO.md, etc.                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Generate AI Analysis (generateRepoAnalysis)              │
│    └─ Summary, Insights, Actions                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Save to Database (db.upsertRepoData)                     │
│    ├─ Bundle: repo metadata + documents                     │
│    ├─ Analysis: AI-generated insights                       │
│    └─ Timestamp: updatedAt                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Display to User                                          │
│    └─ Show cached indicator and refresh option              │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

1. `/src/app/api/repos/[owner]/[repo]/intelligence/route.ts`
   - Added db import and upsertRepoData call

2. `/src/app/repos/[owner]/[repo]/page.tsx`
   - Changed from direct GitHub fetch to database-first approach
   - Added timestamp display
   - Added refresh button
   - Added better error handling

3. `/src/lib/github.ts`
   - Removed `upsertRepositoryDocument()` function
   - Added `fetchDocuments` flag support in `fetchRepositoryBundle()`

4. `/src/config/projects.ts`
   - Added `fetchDocuments?: boolean` to ProjectConfigEntry type
   - Removed `PROJECT_INTELLIGENCE.md` from DEFAULT_FILES
   - Added documentation comment

5. `/src/app/page.tsx`
   - Updated GITHUB_TOKEN message to remove mention of markdown persistence

## Benefits

✅ **Performance**: Pages load from database instead of waiting for GitHub API
✅ **Reliability**: Reduced dependency on GitHub API availability
✅ **Rate Limits**: Fewer GitHub API calls = less likely to hit rate limits
✅ **Consistency**: Single source of truth (database) for all data
✅ **Simplicity**: No complex markdown file synchronization logic
✅ **User Experience**: Cached data with clear timestamps and refresh options

## Testing Recommendations

1. **Clear existing cache**: Delete `.data/repos.db` to start fresh
2. **Test first load**: Visit a repo page, verify it fetches from GitHub and saves to DB
3. **Test cached load**: Reload the page, verify it loads from DB (should be instant)
4. **Test refresh**: Click refresh button, verify it updates the cache
5. **Test main dashboard**: Verify the dashboard shows cached data correctly
6. **Test without GITHUB_TOKEN**: Verify graceful fallback behavior

## Database Schema

```typescript
type RepoRecord = {
  key: string;              // "owner/repo" (lowercase)
  bundle: RepositoryBundle; // Repo metadata + documents
  analysis: RepoAnalysis | null; // AI-generated insights
  updatedAt: string;        // ISO timestamp
  _id?: string;             // NeDB internal ID
}
```

## Configuration Options

To disable document fetching for a specific repo:

```typescript
{
  owner: "pkibbey",
  repo: "my-repo",
  fetchDocuments: false, // Only fetch metadata, skip README/docs
}
```

To modify which documents are fetched globally, edit `DEFAULT_FILES` in `config/projects.ts`.

## Migration Complete ✅

All markdown file writes have been eliminated. The app now exclusively uses the NoSQL database for all data persistence.
