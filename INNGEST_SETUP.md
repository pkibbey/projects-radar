# Inngest Setup Guide

## Overview

This project now uses **Inngest** for background task processing. All long-running operations (repository analysis, tech stack detection, intelligence refresh) are now handled asynchronously through Inngest's serverless task queue.

## What Changed

### 1. **Batch Generation** (`/api/batch/generate-remaining`)
- **Before**: Processed all repositories synchronously in a single request (very slow for large batches)
- **After**: Queues each repository as an individual Inngest task, allowing parallel processing

### 2. **Repository Intelligence Refresh** (`/api/repos/[owner]/[repo]/intelligence`)
- **Before**: Processed synchronously (blocking request)
- **After**: Queues refresh in background, returns immediately

## Setup Instructions

### Step 1: Get an Inngest Account

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Sign up for a free account
3. Create a new project

### Step 2: Add Environment Variables

Add these to your `.env.local`:

```
INNGEST_EVENT_KEY=<your-event-key>
INNGEST_BASE_URL=https://app.inngest.com
```

Get your `INNGEST_EVENT_KEY` from:
- Inngest Dashboard → Your Project → Settings → Event Keys → Copy your key

### Step 3: Deploy or Run Locally

#### For Local Development

Just run your dev server as normal:
```bash
npm run dev
```

The Inngest functions will work in dev mode without additional setup.

#### For Production (Vercel)

1. Add the environment variables to your Vercel project settings
2. Deploy your code

Inngest will automatically handle the webhook integration with your deployment.

### Step 4: Verify Setup

1. Trigger a batch generation or refresh
2. Go to [https://app.inngest.com](https://app.inngest.com)
3. Check your project's Events dashboard to see tasks being processed

## How It Works

### Three Inngest Functions

#### 1. `processSingleRepository`
- Processes one repository
- Fetches bundle data, generates AI analysis, extracts tech stack
- Auto-retries on transient failures
- Gracefully handles 403 (private repos) and rate limits

#### 2. `processBatchRepositories`
- Lists all remaining repositories
- Queues each one as a `processSingleRepository` task
- Allows parallel processing across your worker pool

#### 3. `refreshRepositoryIntelligence`
- Re-analyzes a specific repository
- Used when you want to refresh insights

### Request Flow

```
Client → API Endpoint
          ↓
    Inngest.send()
          ↓
    Return 202 (Accepted)
          ↓
    Client Response Immediate
          ↓
    Inngest Worker Processes
          ↓
    Results Stored in DB
```

## API Endpoint Changes

### Batch Generation

**Before:**
```
POST /api/batch/generate-remaining
→ Returns 200 when complete (could take minutes)
```

**After:**
```
POST /api/batch/generate-remaining
→ Returns 202 immediately
→ Tasks queued with Inngest
→ Processing happens in background
```

### Repository Intelligence

**Before:**
```
POST /api/repos/[owner]/[repo]/intelligence
→ Returns 200 with analysis (could take 30+ seconds)
```

**After:**
```
POST /api/repos/[owner]/[repo]/intelligence
→ Returns 202 immediately
→ Task queued with Inngest
→ Processing happens in background
```

## Frontend Considerations

Your UI components that call these endpoints may need updates:

### For Batch Generation
- Remove loading spinner that waits for request completion
- Show message like "Batch processing queued - results will appear in a few moments"
- Optionally poll the database/API for updates

### For Repository Refresh
- Already handles async well - the button returns quickly
- Update success message from "Analysis complete" to "Refreshing in background"
- Poll or use real-time updates to refresh the component when complete

## Debugging

### View Logs in Inngest Dashboard

1. Go to your Inngest project dashboard
2. Click "Functions" to see all registered functions
3. Click on a function to see recent runs
4. View detailed logs for each run (including console.log statements)

### Local Development

Logs will appear in your Next.js dev server console:

```
[Inngest] processSingleRepository: Processing repository: owner/repo
[Inngest] processSingleRepository: Successfully processed owner/repo
```

## Rate Limiting & GitHub API

All three functions respect GitHub API rate limits:
- If a 403 (private repo) is encountered, the repo is skipped
- If a rate limit error occurs, the task is retried later
- Inngest will exponentially back off retries

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `INNGEST_EVENT_KEY` | Your Inngest API key | `inngest_ek_prod_xxx` |
| `INNGEST_BASE_URL` | Inngest API endpoint | `https://app.inngest.com` |
| `GITHUB_TOKEN` | GitHub API token (existing) | `ghp_xxx` |

## Troubleshooting

### "INNGEST_EVENT_KEY is not defined"
- Check `.env.local` has the key
- Restart dev server after adding env vars

### Tasks not appearing in dashboard
- Verify `INNGEST_EVENT_KEY` is correct
- Check network tab in browser DevTools to see if POST to `/api/inngest` is returning 200
- Make sure dev server is running

### "Failed to queue batch processing"
- Check that `/api/inngest` route exists
- Verify Inngest package is installed: `npm list inngest`

## Next Steps

- Monitor your Inngest dashboard for task processing
- Update UI to show background processing status
- Consider adding webhooks to sync results back to frontend in real-time
- Set up Inngest alerts for failed tasks
