# Slack App Setup Guide

Complete guide for creating and configuring a Slack app for your agent.

## Prerequisites

- A Slack workspace where you have permission to install apps
- Access to https://api.slack.com
- Your project's `manifest.json` file

## Step 1: Create the Slack App

1. Go to https://api.slack.com/apps/new
2. Select **"From an app manifest"**
3. Choose your target workspace from the dropdown
4. Click **Next**

### Configure the Manifest

5. Switch to the **JSON** tab
6. Delete any existing content
7. Paste the contents of your project's `manifest.json`

**The webhook URL depends on your framework:**

- **Chat SDK:** `https://your-domain.vercel.app/api/webhooks/slack`
- **Bolt for JavaScript:** `https://your-domain.vercel.app/api/slack/events`

#### Sample Manifest (Chat SDK)

```json
{
  "display_information": {
    "name": "Your Slack Agent",
    "description": "AI-powered assistant",
    "background_color": "#000000"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "Your Agent",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "app_mentions:read",
        "groups:history",
        "im:history",
        "mpim:history",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "channels:join"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-domain.vercel.app/api/webhooks/slack",
      "bot_events": [
        "app_mention",
        "assistant_thread_started",
        "assistant_thread_context_changed",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://your-domain.vercel.app/api/webhooks/slack"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

#### Sample Manifest (Bolt for JavaScript)

Uses the same structure, but with a different webhook URL path:

```json
{
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-domain.vercel.app/api/slack/events",
      "bot_events": ["app_mention", "assistant_thread_started", "assistant_thread_context_changed", "message.channels", "message.groups", "message.im", "message.mpim"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://your-domain.vercel.app/api/slack/events"
    }
  }
}
```

**Note:** The Chat SDK manifest includes `reactions:read` and `reactions:write` scopes for the `onReaction` handler. Add these to Bolt projects if you handle reaction events.

8. Click **Next**
9. Review the permissions and click **Create**

## Step 2: Install to Workspace

1. In your new app's dashboard, navigate to **Install App** in the sidebar
2. Click **Install to Workspace**
3. Review the permissions request
4. Click **Allow**

## Step 3: Get Your Credentials

### Bot User OAuth Token

1. Go to **Install App** in the sidebar
2. Find **Bot User OAuth Token**
3. Copy the token (starts with `xoxb-`)

**Security:** Never commit this token to version control.

### Signing Secret

1. Go to **Basic Information** in the sidebar
2. Scroll to **App Credentials**
3. Find **Signing Secret**
4. Click **Show** and copy the value

## Step 4: Configure URLs (Production)

For production deployments, update the URLs in your manifest and re-upload it:

### Check for Deployment Protection

If your Vercel project has Deployment Protection enabled, you'll need a bypass secret:

1. Go to Vercel Dashboard -> Project Settings -> Deployment Protection
2. Under "Protection Bypass for Automation", copy the secret
3. Add it as a query parameter to your URLs:
   - **Chat SDK:** `https://your-app.vercel.app/api/webhooks/slack?x-vercel-protection-bypass=YOUR_SECRET`
   - **Bolt:** `https://your-app.vercel.app/api/slack/events?x-vercel-protection-bypass=YOUR_SECRET`

### Update the Manifest

1. Edit your project's `manifest.json`
2. Update the URLs in these fields (using your framework's webhook path):
   ```json
   {
     "settings": {
       "event_subscriptions": {
         "request_url": "https://your-app.vercel.app/api/webhooks/slack"
       },
       "interactivity": {
         "request_url": "https://your-app.vercel.app/api/webhooks/slack"
       }
     }
   }
   ```
   **Chat SDK** uses `/api/webhooks/slack`. **Bolt** uses `/api/slack/events`.
3. Go to your app at https://api.slack.com/apps
4. Navigate to **App Manifest** in the sidebar
5. Switch to the **JSON** tab
6. Replace the manifest with your updated version
7. Click **Save Changes**

This approach is more reliable than manually editing Event Subscriptions and Interactivity pages separately.

## Step 5: Local Development Setup

For local development, use ngrok to create a tunnel:

```bash
# Start your dev server
pnpm dev

# In a separate terminal, expose your local server
ngrok http 3000
```

Then update your Slack app's manifest with the ngrok URL:
- **Chat SDK:** `https://abc123.ngrok.io/api/webhooks/slack`
- **Bolt:** `https://abc123.ngrok.io/api/slack/events`

## Troubleshooting

### "url_verification" failed

**Cause:** Slack couldn't verify your endpoint.

**Solutions:**
1. Ensure your server is running
2. Check the URL is correct and accessible (Chat SDK: `/api/webhooks/slack`, Bolt: `/api/slack/events`)
3. Verify your endpoint returns the `challenge` parameter correctly (both frameworks handle this automatically)
4. If using Vercel with Deployment Protection, add the bypass secret to your URL (see Step 4)

### "invalid_auth" errors

**Cause:** Bot token is invalid or expired.

**Solutions:**
1. Regenerate the token in **Install App**
2. Verify you're using the correct token (not a user token)
3. Check the token hasn't been revoked

### Events not being received

**Cause:** Event subscriptions not configured correctly.

**Solutions:**
1. Verify **Enable Events** is toggled On
2. Check the Request URL is correct (Chat SDK: `/api/webhooks/slack`, Bolt: `/api/slack/events`)
3. Ensure all required bot events are subscribed
4. Check your server logs for incoming requests

### "channel_not_found" when joining channels

**Cause:** Bot can't access private channels.

**Solutions:**
1. The bot can only join public channels
2. For private channels, a user must invite the bot
3. Check the channel ID is correct

### Rate limiting

**Cause:** Too many API requests.

**Solutions:**
1. Implement exponential backoff
2. Cache responses where appropriate
3. Batch operations when possible

## Required Bot Scopes Explained

| Scope | Purpose |
|-------|---------|
| `channels:history` | Read messages in public channels |
| `channels:read` | View basic channel info |
| `chat:write` | Send messages as the bot |
| `commands` | Handle slash commands |
| `app_mentions:read` | Receive @mention events |
| `groups:history` | Read messages in private channels (if invited) |
| `im:history` | Read direct message history |
| `mpim:history` | Read group DM history |
| `assistant:write` | Use Slack's Assistant features |
| `reactions:read` | Receive reaction events (for `onReaction` handler) |
| `reactions:write` | Add emoji reactions |
| `channels:join` | Join public channels |

## Next Steps

After setup:
1. Add the bot to a channel: `/invite @YourBotName`
2. Mention the bot: `@YourBotName hello`
3. Check your server logs to verify events are received
