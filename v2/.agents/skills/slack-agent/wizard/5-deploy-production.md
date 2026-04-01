# Phase 5: Deploy to Production

This phase guides the user through deploying their Slack agent to Vercel.

---

## Step 5.1: Push to GitHub

```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

---

## Step 5.2: Deploy to Vercel

**Option A - Via CLI:**
```bash
vercel
```

**Option B - Via Dashboard:**

### If using Chat SDK
> 1. Go to https://vercel.com/new
> 2. Import your GitHub repository
> 3. Framework Preset should auto-detect **Next.js**
> 4. Click **Deploy**

### If using Bolt for JavaScript
> 1. Go to https://vercel.com/new
> 2. Import your GitHub repository
> 3. Set Framework Preset to **Other**
> 4. Click **Deploy**

---

## Step 5.3: Configure Production Environment Variables

Tell the user:

> **Add environment variables in Vercel:**

### If using Chat SDK

> **Option A - Via CLI:**
> ```bash
> vc env add SLACK_BOT_TOKEN
> vc env add SLACK_SIGNING_SECRET
> vc env add REDIS_URL
> ```
> Paste each value when prompted. Select all environments (Production, Preview, Development) when asked.
>
> **Option B - Via Dashboard:**
> 1. Go to your project in Vercel Dashboard
> 2. Go to **Settings** -> **Environment Variables**
> 3. Add these variables:
>    - `SLACK_BOT_TOKEN` = your bot token
>    - `SLACK_SIGNING_SECRET` = your signing secret
>    - `REDIS_URL` = your Redis connection URL
> 4. Click **Save**

### If using Bolt for JavaScript

> **Option A - Via CLI:**
> ```bash
> vc env add SLACK_BOT_TOKEN
> vc env add SLACK_SIGNING_SECRET
> ```
> Paste each value when prompted. Select all environments (Production, Preview, Development) when asked.
>
> **Option B - Via Dashboard:**
> 1. Go to your project in Vercel Dashboard
> 2. Go to **Settings** -> **Environment Variables**
> 3. Add these variables:
>    - `SLACK_BOT_TOKEN` = your bot token
>    - `SLACK_SIGNING_SECRET` = your signing secret
> 4. Click **Save**

**After adding variables:** Redeploy the project for changes to take effect.
- CLI: `vercel --prod`
- Dashboard: Deployments -> ... -> Redeploy

**Note for AI configuration:**
- **Using Vercel AI Gateway?** No AI API keys needed - it handles authentication automatically.
- **Using a direct provider SDK?** Also add your provider's API key (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).

---

## Step 5.4: Update Slack App URLs for Production

Ask the user for their Vercel deployment URL and deployment protection status:

> **What's your Vercel deployment URL?** (e.g., `https://my-agent.vercel.app`)

> **Is Deployment Protection enabled for this project?**
>
> Deployment Protection prevents unauthorized access to preview deployments. If enabled, Slack won't be able to verify your URL without a bypass secret.
>
> - Check your Vercel Dashboard -> Project Settings -> Deployment Protection
> - If "Standard Protection" or "All Deployments" is enabled, answer **Yes**

**If Deployment Protection is enabled:**

Tell the user:

> **Get your Deployment Protection Bypass Secret:**
>
> 1. Go to your Vercel Dashboard -> Project Settings -> Deployment Protection
> 2. Under "Protection Bypass for Automation", copy the secret
>    (or find it as the `VERCEL_AUTOMATION_BYPASS_SECRET` environment variable)
> 3. Share this secret with me so I can add it to the manifest URLs

Once they provide the secret, the URL format depends on the framework:

### If using Chat SDK
```
https://YOUR-APP.vercel.app/api/webhooks/slack?x-vercel-protection-bypass=YOUR_SECRET
```

### If using Bolt for JavaScript
```
https://YOUR-APP.vercel.app/api/slack/events?x-vercel-protection-bypass=YOUR_SECRET
```

**Update the manifest:**

1. Read the project's `manifest.json`
2. Update these fields with the production URL (including bypass parameter if needed):
   - `settings.event_subscriptions.request_url`
   - `settings.interactivity.request_url`
3. Write the updated `manifest.json`

Then tell the user:

> **Point Slack to your production URL:**
>
> 1. Go to your Slack app at https://api.slack.com/apps
> 2. Click on your app
> 3. Go to **App Manifest** in the sidebar
> 4. Switch to the **JSON** tab
> 5. Replace the entire manifest with the content below
> 6. Click **Save Changes**
> 7. If prompted, click **Accept** to confirm the changes

Display the full updated `manifest.json` content for the user to copy.

**Security Note (if using bypass secret):**

> **Security Considerations:**
>
> - The bypass secret is visible in your Slack app configuration to anyone with access
> - Query parameters may appear in server logs
> - Your bot still validates requests using Slack's signing secret
> - Consider rotating the bypass secret periodically

---

## Step 5.5: Verify Production

Tell the user:

> **Verify everything works:**
>
> 1. Send a message to your bot in Slack
> 2. Check Vercel Dashboard -> Logs for the request
> 3. Confirm the bot responds correctly

---

## Troubleshooting

### "url_verification" failed
- Make sure your deployment is complete
- Check the URL is correct:
  - **Chat SDK:** includes `/api/webhooks/slack`
  - **Bolt:** includes `/api/slack/events`
- If using Vercel with Deployment Protection, add the bypass secret to your URL

### "invalid_auth" error
- Check SLACK_BOT_TOKEN is correct in Vercel environment variables
- Make sure you redeployed after adding the variables

---

## Next Phase (Optional)

Once production is verified, you may optionally proceed to [Phase 6: Set Up Testing](./6-setup-testing.md).
