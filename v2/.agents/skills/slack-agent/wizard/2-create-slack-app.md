# Phase 2: Create Slack App

This phase guides the user through creating their Slack app with a customized manifest.

---

## Step 2.0: Customize Your App

Before creating the Slack app, collect customization details from the user. Use the context from Phase 1 (agent purpose) as defaults.

Ask the user:

> **Let's customize your Slack app:**
>
> 1. **App Name** (required) - The name users see in Slack (e.g., "Joke Bot")
> 2. **App Description** (optional) - Brief description shown in Slack (e.g., "Tells hilarious jokes on demand")
> 3. **Bot Display Name** (optional) - How the bot appears in conversations (defaults to App Name)
> 4. **Background Color** (optional) - Hex color for app icon background (e.g., "#4A154B")

**After collecting responses:**

1. Read the `manifest.json` file from the project (or create one if it doesn't exist)
2. Update these fields with the user's values:
   - `display_information.name` -> App Name
   - `display_information.description` -> App Description (if provided)
   - `features.bot_user.display_name` -> Bot Display Name (or App Name if not specified)
   - `display_information.background_color` -> Background Color (if provided, without the `#` prefix)
3. Write the updated `manifest.json` back to the project
4. Display the updated manifest content for the user to copy into Slack's web UI

**Example updated manifest fields:**
```json
{
  "display_information": {
    "name": "Joke Bot",
    "description": "Tells hilarious jokes on demand",
    "background_color": "#4A154B"
  },
  "features": {
    "bot_user": {
      "display_name": "Joke Bot",
      "always_online": true
    }
  }
}
```

**Important:** The webhook URL should use `/api/webhooks/slack` (the Chat SDK convention):
```json
{
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-domain.vercel.app/api/webhooks/slack"
    },
    "interactivity": {
      "request_url": "https://your-domain.vercel.app/api/webhooks/slack"
    }
  }
}
```

---

## Step 2.1: Create the App

Tell the user:

> **Create your Slack App:**
>
> 1. Go to https://api.slack.com/apps/new
> 2. Select **"From an app manifest"**
> 3. Choose your target workspace
> 4. Switch to the **JSON** tab
> 5. Paste the manifest content below
> 6. Click **Next**, review permissions, then **Create**

Read and display the `manifest.json` file so the user can copy it.

---

## Step 2.2: Install to Workspace

Tell the user:

> **Install the app:**
>
> 1. In your app dashboard, go to **Install App** (left sidebar)
> 2. Click **Install to Workspace**
> 3. Click **Allow** to authorize

---

## Step 2.3: Get Your Credentials

Tell the user to collect these two values:

> **Get your credentials (you'll need these for .env):**
>
> **Bot Token:**
> - Go to **Install App** in the sidebar
> - Copy the **Bot User OAuth Token** (starts with `xoxb-`)
>
> **Signing Secret:**
> - Go to **Basic Information** in the sidebar
> - Scroll to **App Credentials**
> - Click **Show** next to Signing Secret and copy it

---

## Next Phase

Once the Slack app is created and credentials are collected, proceed to [Phase 3: Configure Environment](./3-configure-environment.md).
