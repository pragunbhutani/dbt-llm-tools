# Phase 3: Configure Environment

This phase sets up the environment variables needed for the Slack agent to run.

---

## Step 3.1: Create .env File

Create the `.env` file based on the user's LLM choice from Step 1.3:

**If using Vercel AI Gateway (default):**
```env
# Slack Credentials (required - auto-detected by Chat SDK)
SLACK_BOT_TOKEN=xoxb-paste-your-token-here
SLACK_SIGNING_SECRET=paste-your-signing-secret-here

# State Persistence (required for production)
REDIS_URL=redis://default:password@host:port

# No AI keys needed - Vercel AI Gateway handles this automatically!
```

**If using Direct Provider SDK:**
```env
# Slack Credentials (required - auto-detected by Chat SDK)
SLACK_BOT_TOKEN=xoxb-paste-your-token-here
SLACK_SIGNING_SECRET=paste-your-signing-secret-here

# State Persistence (required for production)
REDIS_URL=redis://default:password@host:port

# AI Provider API Key (get from your provider's dashboard)
# For OpenAI: https://platform.openai.com/api-keys
# For Anthropic: https://console.anthropic.com/settings/keys
# For Google: https://aistudio.google.com/apikey
OPENAI_API_KEY=sk-your-key-here
# or ANTHROPIC_API_KEY=sk-ant-your-key-here
# or GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

Also help them install the provider package if using a direct SDK:
```bash
# For OpenAI
pnpm add @ai-sdk/openai

# For Anthropic
pnpm add @ai-sdk/anthropic

# For Google
pnpm add @ai-sdk/google
```

**If No LLM needed:**
```env
# Slack Credentials (required - auto-detected by Chat SDK)
SLACK_BOT_TOKEN=xoxb-paste-your-token-here
SLACK_SIGNING_SECRET=paste-your-signing-secret-here

# State Persistence (required for production)
REDIS_URL=redis://default:password@host:port
```

Ask the user to paste their Bot Token and Signing Secret, then write the `.env` file.

**Security:** Never display the full token values back to the user or in logs.

**Note on REDIS_URL:** For local development, you can skip `REDIS_URL` and use an in-memory state adapter instead. Update `lib/bot.tsx`:
```typescript
import { createMemoryState } from "chat";

export const bot = new Chat({
  userName: "mybot",
  adapters: { slack: createSlackAdapter() },
  state: process.env.REDIS_URL
    ? createRedisState()
    : createMemoryState(),
});
```

---

## Step 3.2: Verify .gitignore

Ensure credentials won't be committed:

```bash
# Check .gitignore includes .env
grep -q "^\.env" .gitignore || echo ".env" >> .gitignore
```

---

## Next Phase

Once the environment is configured, proceed to [Phase 4: Test Locally](./4-test-locally.md).
