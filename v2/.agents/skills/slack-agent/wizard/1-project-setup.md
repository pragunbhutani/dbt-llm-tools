# Phase 1: Project Setup

This phase handles creating a new Slack agent project using the Chat SDK with Next.js.

## Check Current State

First, look for existing project indicators:
- `package.json` with `chat` dependency
- `manifest.json` (Slack app manifest)
- `lib/bot.ts` or `lib/bot.tsx` (bot instance)
- `.env` file with credentials

If these exist, this is an existing project - skip to Phase 2 or 3.

---

## For NEW Projects

### Step 1.1: Understand the Agent Purpose

Before scaffolding the project, ask the user what they're building:

> **What kind of Slack agent are you building?**
>
> Examples: joke bot, support assistant, weather bot, task manager, standup bot, etc.
>
> Tell me what you want your agent to do, and I'll create a custom implementation plan for you.

Based on their response, generate a recommended project name:
- "joke bot" -> `joke-slack-agent`
- "customer support" -> `support-slack-agent`
- "weather" -> `weather-slack-agent`
- "task manager" -> `taskbot-slack-agent`
- "standup" -> `standup-slack-agent`

Use the pattern: `<purpose>-slack-agent` (lowercase, hyphens, no spaces).

**Store this context** - you'll use it for manifest customization in Phase 2.

### Step 1.2: Generate Custom Implementation Plan

Based on the user's stated purpose, generate a custom implementation plan tailored to their specific agent.

**Reference document:** See `reference/agent-archetypes.md` for common patterns and the plan template.

**Instructions for plan generation:**

1. **Analyze the agent purpose** to identify:
   - Primary interaction patterns (slash commands, mentions, DMs, scheduled)
   - Whether AI/LLM is needed and what for
   - State requirements (stateless, thread state, persistent)
   - UI needs (simple text, JSX components, modals)
   - External integrations needed (APIs, webhooks, databases)

2. **Match to archetypes** from the reference document:
   - Standup/Reminder Bot
   - Support/Help Desk Bot
   - Information/Lookup Bot
   - Conversational AI Bot
   - Automation Bot
   - Notification/Alerting Bot
   - Or combine multiple archetypes for hybrid agents

3. **Generate a specific plan** using the template structure:
   - Overview (1-2 sentences)
   - Core Features (3-5 specific features)
   - Slash Commands (with names, descriptions, examples)
   - Event Handlers (what triggers the bot - `onNewMention`, `onSubscribedMessage`, `onSlashCommand`, `onAction`, `onReaction`)
   - AI Tools (if using AI - with specific tool names and parameters)
   - Scheduled Jobs (if applicable - with cron expressions)
   - State Management (stateless, Chat SDK state, or database)
   - UI Components (what JSX elements are needed - `<Card>`, `<Button>`, `<Modal>`, etc.)
   - Files to Create/Modify (specific file paths using Chat SDK conventions)

4. **Include complexity indicator:**
   - **Simple** - 1-2 commands, no database, can be built quickly
   - **Medium** - Multiple commands, some state, moderate effort
   - **Complex** - Multi-turn workflows, database, scheduled jobs

**After generating the plan**, proceed to [Phase 1b: Approve Plan](./1b-approve-plan.md) to present it to the user for approval.

---

### Step 1.3: Choose LLM Provider (if using AI)

> **Note:** Only proceed to this step after the implementation plan has been approved in [Phase 1b](./1b-approve-plan.md).

Ask the user if their agent will use AI/LLM capabilities:

> **Will your agent use AI/LLM capabilities?**
>
> 1. **Yes, using Vercel AI Gateway** (Recommended)
>    - Easiest setup - no API keys needed when deployed on Vercel
>    - Access to multiple providers (OpenAI, Anthropic, Google, etc.)
>    - Built-in rate limiting and observability
>
> 2. **Yes, using a direct provider SDK**
>    - Direct integration with OpenAI, Anthropic, or other providers
>    - Requires managing your own API keys
>    - More control over provider-specific features
>
> 3. **No LLM needed**
>    - Simple automation bot (slash commands, integrations, etc.)
>    - Can add AI capabilities later

Based on their choice:

**If Vercel AI Gateway (default):**
- The project will include `ai` and `@ai-sdk/gateway` packages
- No additional setup needed - works automatically on Vercel
- Store this choice for Phase 3 (no AI keys needed in .env)

**If Direct Provider SDK:**
- Ask which provider: OpenAI, Anthropic, Google, or other
- Note they'll need to add the provider package (e.g., `@ai-sdk/openai`)
- Store this choice for Phase 3 (will need API key in .env)

**If No LLM:**
- Skip AI-related configuration
- The base Slack functionality will work without AI packages

**Store this context** - you'll use it for environment configuration in Phase 3.

### Step 1.4: Scaffold the Project

Create a new Next.js project with Chat SDK:

```bash
# Create Next.js project with recommended name
npx create-next-app@latest <recommended-name> --typescript --app --tailwind --eslint
cd <recommended-name>

# Install Chat SDK dependencies
pnpm add chat @chat-adapter/slack @chat-adapter/state-redis

# Install AI SDK (if using AI)
pnpm add ai @ai-sdk/gateway zod

# Start fresh git history
git init
git add .
git commit -m "Initial commit from create-next-app + Chat SDK"
```

Ask the user to confirm or customize the project name before proceeding.

### Step 1.5: Set Up Chat SDK Structure

After scaffolding, create the core Chat SDK files:

1. **Create `lib/bot.tsx`** - Bot instance:
   ```typescript
   import { Chat } from "chat";
   import { createSlackAdapter } from "@chat-adapter/slack";
   import { createRedisState } from "@chat-adapter/state-redis";

   export const bot = new Chat({
     userName: "<bot-name>",
     adapters: {
       slack: createSlackAdapter(),
     },
     state: createRedisState(),
   });

   // Register event handlers
   bot.onNewMention(async (thread, message) => {
     await thread.subscribe();
     await thread.post("Hello! I'm listening.");
   });

   bot.onSubscribedMessage(async (thread, message) => {
     await thread.post(`You said: ${message.text}`);
   });
   ```

2. **Create `app/api/webhooks/[platform]/route.ts`** - Webhook handler:
   ```typescript
   import { after } from "next/server";
   import { bot } from "@/lib/bot";

   export async function POST(request: Request, context: { params: Promise<{ platform: string }> }) {
     const { platform } = await context.params;
     const handler = bot.webhooks[platform as keyof typeof bot.webhooks];
     if (!handler) return new Response("Unknown platform", { status: 404 });
     return handler(request, { waitUntil: (task) => after(() => task) });
   }
   ```

3. **Update `tsconfig.json`** - Add JSX support for Chat SDK:
   ```json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "chat"
     }
   }
   ```

### Step 1.6: Verify Project Structure

After setup, verify the project structure:
- `lib/bot.tsx` - Bot instance
- `app/api/webhooks/[platform]/route.ts` - Webhook handler
- `manifest.json` - Slack app configuration (will be created in Phase 2)

If the structure looks correct, proceed to Phase 2.

---

## For EXISTING Projects

Verify the project structure:
- `lib/bot.ts` or `lib/bot.tsx` - Bot instance
- `app/api/webhooks/[platform]/route.ts` - Webhook handler
- `manifest.json` - Slack app configuration

If the structure looks correct, proceed to Phase 2 (Create Slack App) or Phase 3 (Configure Environment) depending on what's already done.

---

## Next Phase

Once the project is set up, proceed to [Phase 2: Create Slack App](./2-create-slack-app.md).
