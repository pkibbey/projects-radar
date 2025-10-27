# Inngest Quick Reference

## 5-Minute Setup

1. **Create Inngest account**: https://app.inngest.com
2. **Add to `.env.local`**:
   ```
   INNGEST_EVENT_KEY=<your-key-from-inngest-dashboard>
   INNGEST_BASE_URL=https://app.inngest.com
   ```
3. **Restart dev server**: `npm run dev`
4. **Done!** Your background tasks are now live

## What's Happening Behind the Scenes

### When you trigger batch generation:
```
Browser → /api/batch/generate-remaining
         → Inngest queues all repos
         → API returns 202 immediately
         → Your browser moves on
         → Inngest processes repos in parallel
         → Results appear in DB
```

### When you refresh a repo's intelligence:
```
Browser → /api/repos/[owner]/[repo]/intelligence
        → Inngest queues refresh task
        → API returns 202 immediately
        → Inngest analyzes repo
        → Results appear in DB
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/inngest.ts` | Inngest client & event types |
| `src/lib/inngest-functions.ts` | The 3 background task functions |
| `src/app/api/inngest/route.ts` | Webhook endpoint for Inngest |
| `src/app/api/batch/generate-remaining/route.ts` | Now queues tasks instead of processing |
| `src/app/api/repos/[owner]/[repo]/intelligence/route.ts` | Now queues tasks instead of processing |

## Monitoring Tasks

1. Open https://app.inngest.com
2. Go to your project dashboard
3. Click "Functions" to see all tasks
4. Click a function to see recent runs and logs

## Troubleshooting Checklist

- [ ] `.env.local` has `INNGEST_EVENT_KEY`
- [ ] Dev server restarted after adding env vars
- [ ] Can trigger batch generation without errors
- [ ] Check Inngest dashboard - are events appearing?
- [ ] Check browser console for any fetch errors

## Common Questions

**Q: How long does processing take?**
A: Depends on repo count. Inngest processes ~5-10 repos/minute by default. Upgrade plan for faster processing.

**Q: What if I lose internet connection?**
A: Inngest retries automatically. Tasks will continue when you're back online.

**Q: Can I see real-time progress?**
A: Check Inngest dashboard or poll your database. Could add real-time updates later.

**Q: Do I need to change my frontend?**
A: Optional. Your UI can poll DB for updates or show "processing" status indefinitely. Most elegant: Inngest webhooks to frontend.

## Environment Variables

```bash
# Required for Inngest
INNGEST_EVENT_KEY=inngest_ek_prod_xxxxx
INNGEST_BASE_URL=https://app.inngest.com

# Already required for GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_OWNER=yourname
```

## Production Notes

- Free tier: Good for development
- Pro tier: 10,000 free task runs/month, then $1 per 1,000
- No server to manage - fully serverless
- Automatic scaling - no config needed
