# Vercel Deployment Guide

Complete guide for deploying your Slack agent to Vercel.

## Prerequisites

- A Vercel account (https://vercel.com)
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Slack app credentials from the Slack setup

## Deployment Options

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your repository
4. Configure project settings:
   - **Chat SDK:** Framework Preset = **Next.js**, Output Directory = `.next` (auto-detected)
   - **Bolt:** Framework Preset = **Other**, Output Directory = `.output`
   - **Root Directory:** Leave as default
   - **Build Command:** `pnpm build` (or leave default)
5. Click **Deploy**

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login (if not already)
vercel login

# Deploy
vercel

# For production
vercel --prod
```

## Configure Environment Variables

After initial deployment, configure your environment variables.

### Via Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:

| Variable | Value | Environments | Required By |
|----------|-------|--------------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-your-token` | Production, Preview | Both |
| `SLACK_SIGNING_SECRET` | `your-signing-secret` | Production, Preview | Both |
| `REDIS_URL` | `redis://...` | Production, Preview | Chat SDK only |

4. Click **Save** for each variable
5. **Redeploy** your project to apply the changes

### Via CLI

```bash
# Add environment variable
vercel env add SLACK_BOT_TOKEN production

# You'll be prompted to enter the value
```

## Update Slack App URLs

After deployment, update your Slack app to use the production URL.

1. Get your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Go to https://api.slack.com/apps
3. Select your production Slack app
4. Update these locations:

### Event Subscriptions

1. Go to **Event Subscriptions**
2. Update **Request URL** to your framework's webhook path:
   - **Chat SDK:** `https://your-app.vercel.app/api/webhooks/slack`
   - **Bolt:** `https://your-app.vercel.app/api/slack/events`
3. Wait for verification (green checkmark)
4. Click **Save Changes**

### Interactivity & Shortcuts

1. Go to **Interactivity & Shortcuts**
2. Update **Request URL** (same path as Event Subscriptions above)
3. Click **Save Changes**

### Slash Commands (if using)

1. Go to **Slash Commands**
2. Edit each command
3. Update **Request URL** (same path as Event Subscriptions above)
4. Click **Save**

## Verify Deployment

1. Open your Slack workspace
2. Find your bot (it should show as online)
3. Send a test message: `@YourBot hello`
4. Check Vercel logs for the request:
   - Dashboard > Your Project > **Logs**

## Automatic Deployments

Once connected to Git, Vercel automatically deploys:
- **Production:** On push to `main` branch
- **Preview:** On push to other branches

### Preview Deployments

Each pull request gets a unique preview URL. Note:
- Preview deployments use Preview environment variables
- Slack webhooks won't work on preview URLs unless configured

## Function Configuration

For long-running agent operations, configure function settings in `vercel.json`:

**Chat SDK (Next.js):**
```json
{
  "functions": {
    "app/api/webhooks/[platform]/route.ts": {
      "maxDuration": 30
    }
  }
}
```

**Bolt (Nitro):**
```json
{
  "functions": {
    "api/slack/events.ts": {
      "maxDuration": 30
    }
  }
}
```

**Note:** Free tier has 10s limit, Pro tier allows up to 60s.

## Monitoring

### Vercel Dashboard

- **Deployments:** View deployment history and status
- **Logs:** Real-time function logs
- **Analytics:** Request metrics and performance

### Recommended Logging

Add logging to your agent for debugging:

```typescript
console.log('[Slack Event]', event.type, {
  user: event.user,
  channel: event.channel,
});
```

Logs appear in Vercel Dashboard > Logs.

## Troubleshooting

### 504 Gateway Timeout

**Cause:** Function exceeded time limit.

**Solutions:**
1. Increase `maxDuration` in `vercel.json`
2. Upgrade to Pro tier for longer limits
3. Optimize your agent's response time
4. Stream responses instead of waiting for completion

### Environment Variables Not Working

**Cause:** Variables not available after adding.

**Solutions:**
1. Redeploy after adding variables
2. Check variable scope (Production/Preview/Development)
3. Verify variable names match exactly (case-sensitive)

### Webhook Verification Failed

**Cause:** Slack can't verify your endpoint.

**Solutions:**
1. Ensure deployment is complete
2. Check the URL is exactly correct (Chat SDK: `/api/webhooks/slack`, Bolt: `/api/slack/events`)
3. Verify your endpoint handles the challenge correctly (both frameworks do this automatically)
4. Check Vercel logs for errors

### Cold Start Delays

**Cause:** Serverless function warming up.

**Solutions:**
1. Use Vercel's Edge Functions where possible
2. Optimize bundle size
3. Consider Vercel's Pro tier for reduced cold starts

## Production Checklist

Before going live:

- [ ] Environment variables configured for Production
- [ ] Slack Request URLs updated to production domain (Chat SDK: `/api/webhooks/slack`, Bolt: `/api/slack/events`)
- [ ] Webhook verification successful
- [ ] Test message/mention working
- [ ] Error handling in place
- [ ] Logging configured for debugging
- [ ] Rate limiting considered
- [ ] Separate production Slack app from development

## Rollback

If something goes wrong:

1. Go to **Deployments** in Vercel Dashboard
2. Find a working previous deployment
3. Click the **...** menu
4. Select **Promote to Production**

This instantly reverts to the previous version.
