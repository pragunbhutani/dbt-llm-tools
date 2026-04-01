# Phase 4: Test Locally

This phase guides the user through testing their Slack agent locally using ngrok.

---

## Step 4.0: Link to Vercel (Required for AI Gateway)

Before testing locally, you must connect your project to Vercel. This enables the OIDC token that allows Vercel AI Gateway to work without API keys.

**Create a Vercel project and link it:**

1. **Create the Vercel project** (if not already done):
   ```bash
   vercel
   ```
   Follow the prompts to create a new project. You can cancel the deployment with Ctrl+C after the project is created.

2. **Verify the link:**
   ```bash
   vercel link
   ```
   Confirm the project is linked (creates `.vercel/` directory).

3. **Pull environment variables** (optional but recommended):
   ```bash
   vercel env pull .env.local
   ```

**Why this is required:**

- Vercel AI Gateway uses OIDC tokens for authentication
- Running `vercel link` connects your local project to the Vercel platform
- This enables the `@ai-sdk/gateway` package to authenticate without API keys
- Without this step, AI calls will fail with authentication errors

**Note:** You'll complete the full deployment in Phase 5. This step just establishes the connection needed for local AI Gateway access.

---

## Step 4.1: Start the Dev Server

```bash
pnpm dev
```

### If using Chat SDK
This starts the Next.js dev server on http://localhost:3000.

### If using Bolt for JavaScript
This starts the Nitro server on http://localhost:3000.

---

## Step 4.2: Expose with ngrok

In a **separate terminal**, create a tunnel to expose your local server:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`).

**Note:** If the user doesn't have ngrok installed:
> Install ngrok from https://ngrok.com/download or run `brew install ngrok` on macOS.

---

## Step 4.3: Update Slack App URL

Ask the user for their ngrok URL:

> **What's your ngrok URL?** (e.g., `https://abc123.ngrok.io`)

Once they provide the URL, update the `manifest.json` file:

1. Read the project's `manifest.json`
2. Update these fields with the ngrok URL + the webhook path:
   - `settings.event_subscriptions.request_url`
   - `settings.interactivity.request_url`
3. Write the updated `manifest.json`

### If using Chat SDK
The webhook path is `/api/webhooks/slack`:
```
https://abc123.ngrok.io/api/webhooks/slack
```

### If using Bolt for JavaScript
The webhook path is `/api/slack/events`:
```
https://abc123.ngrok.io/api/slack/events
```

Then tell the user:

> **Connect Slack to your local server:**
>
> 1. Go to your app at https://api.slack.com/apps
> 2. Click on your app
> 3. Go to **App Manifest** in the sidebar
> 4. Switch to the **JSON** tab
> 5. Replace the entire manifest with the content below
> 6. Click **Save Changes**
> 7. If prompted, click **Accept** to confirm the changes

Display the full updated `manifest.json` content for the user to copy.

---

## Step 4.4: Test the Bot

Tell the user:

> **Test your agent:**
>
> 1. Open your Slack workspace
> 2. Invite the bot to a channel: `/invite @YourBotName`
> 3. Mention the bot: `@YourBotName hello!`
> 4. You should see the request in your terminal and get a response

Watch the terminal for any errors.

---

## Troubleshooting

### "url_verification" failed
- Make sure your server is running
- Check the URL is correct:
  - **Chat SDK:** includes `/api/webhooks/slack`
  - **Bolt:** includes `/api/slack/events`
- Verify ngrok tunnel is active

### "invalid_auth" error
- Check SLACK_BOT_TOKEN is correct
- Make sure it starts with `xoxb-`
- Try reinstalling the app in Slack

### "invalid_signature" error
- Check SLACK_SIGNING_SECRET is correct
- Make sure there's no extra whitespace

### Bot doesn't respond
- Check terminal/Vercel logs for errors
- Verify bot is invited to the channel
- Make sure Event Subscriptions URL is verified

### AI Gateway not working / Authentication errors
- Run `vercel link` to connect your project to Vercel
- Ensure `.vercel/` directory exists in your project root
- Try `vercel env pull .env.local` to sync environment
- If still failing, you may need to deploy once (`vercel`) then test locally

### "dispatch_failed" error (500) — Bolt only
This is caused by H3's `toWebRequest()` consuming the request body stream before signature verification.

**Fix:** Update `server/api/slack/events.post.ts` to buffer the body manually:
```typescript
import { defineEventHandler, getRequestURL, readRawBody } from "h3";

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event, "utf8");
  const request = new Request(getRequestURL(event), {
    method: event.method,
    headers: event.headers,
    body: rawBody,
  });
  return await handler(request);
});
```

See SKILL.md "Implementation Gotchas" section for the complete pattern.

### "operation_timeout" error on slash commands — Bolt only
This happens when your command handler takes longer than 3 seconds. Even with `await ack()`, the HTTP response is blocked until your entire handler function completes.

**Fix:** Use fire-and-forget pattern:
1. Call `await ack()` immediately
2. Start async work **WITHOUT awaiting**: `processAsync().catch(logger.error)`
3. Use `command.response_url` to post results asynchronously

```typescript
app.command('/mycommand', async ({ ack, command, logger }) => {
  await ack();  // Must be first

  // Fire-and-forget - DON'T await
  processInBackground(command.response_url, command.text)
    .catch((error) => logger.error("Failed:", error));
});
```

See SKILL.md "Implementation Gotchas" section for the complete pattern.

---

## Next Phase

Once local testing is successful, proceed to [Phase 5: Deploy to Production](./5-deploy-production.md).
