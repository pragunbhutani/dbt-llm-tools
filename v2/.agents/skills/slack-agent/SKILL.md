---
name: slack-agent
description: Use when working on Slack agent/bot code, Chat SDK applications, Bolt for JavaScript projects, or projects using @chat-adapter/slack or @slack/bolt. Provides development patterns, testing requirements, and quality standards.
version: 4.0.0
user-invocable: true
---

# Slack Agent Development Skill

This skill supports two frameworks for building Slack agents:

- **Chat SDK** (Recommended for new projects) — `chat` + `@chat-adapter/slack`
- **Bolt for JavaScript** (For existing Bolt projects) — `@slack/bolt` + `@vercel/slack-bolt`

## Skill Invocation Handling

When this skill is invoked via `/slack-agent`, check for arguments and route accordingly:

### Command Arguments

| Argument | Action |
|----------|--------|
| `new` | **Run the setup wizard from Phase 1.** Read `./wizard/1-project-setup.md` and guide the user through creating a new Slack agent. |
| `configure` | Start wizard at Phase 2 or 3 for existing projects |
| `deploy` | Start wizard at Phase 5 for production deployment |
| `test` | Start wizard at Phase 6 to set up testing |
| (no argument) | Auto-detect based on project state (see below) |

### Auto-Detection (No Argument)

If invoked without arguments, detect the project state and route appropriately:

1. **No `package.json` with `chat` or `@slack/bolt`** → Treat as `new`, start Phase 1
2. **Has project but no customized `manifest.json`** → Start Phase 2
3. **Has project but no `.env` file** → Start Phase 3
4. **Has `.env` but not tested** → Start Phase 4
5. **Tested but not deployed** → Start Phase 5
6. **Otherwise** → Provide general assistance using this skill's patterns

### Framework Detection

Detect which framework the project uses:

- **`package.json` contains `"chat"`** → Chat SDK project
- **`package.json` contains `"@slack/bolt"`** → Bolt project
- **Neither detected** → New project, recommend Chat SDK (offer Bolt as alternative)

Store the detected framework and use it to show the correct patterns throughout the wizard and development guidance.

### Wizard Phases

The wizard is located in `./wizard/` with these phases:
- `1-project-setup.md` - Understand purpose, choose framework, generate custom implementation plan
- `1b-approve-plan.md` - Present plan for user approval before scaffolding
- `2-create-slack-app.md` - Customize manifest, create app in Slack
- `3-configure-environment.md` - Set up .env with credentials
- `4-test-locally.md` - Dev server + ngrok tunnel
- `5-deploy-production.md` - Vercel deployment
- `6-setup-testing.md` - Vitest configuration

**IMPORTANT:** For `new` projects, you MUST:
1. Read `./wizard/1-project-setup.md` first
2. Ask the user what kind of agent they want to build
3. Offer framework choice (Chat SDK recommended, Bolt as alternative)
4. Generate a custom implementation plan using `./reference/agent-archetypes.md`
5. Present the plan for approval (Phase 1b) BEFORE scaffolding the project
6. Only proceed to scaffold after the plan is approved

---

## Framework Selection Guide

| Aspect | Chat SDK | Bolt for JavaScript |
|--------|----------|---------------------|
| **Best for** | New projects | Existing Bolt codebases |
| **Packages** | `chat`, `@chat-adapter/slack`, `@chat-adapter/state-redis` | `@slack/bolt`, `@vercel/slack-bolt` |
| **Server** | Next.js App Router | Nitro (H3-based) |
| **Event handling** | `bot.onNewMention()`, `bot.onSubscribedMessage()` | `app.event()`, `app.command()`, `app.message()` |
| **Webhook route** | `app/api/webhooks/[platform]/route.ts` | `server/api/slack/events.post.ts` |
| **Message posting** | `thread.post("text")` / `thread.post(<Card>...)` | `client.chat.postMessage({ channel, text, blocks })` |
| **UI components** | JSX: `<Card>`, `<Button>`, `<Actions>` | Raw Block Kit JSON |
| **State** | `@chat-adapter/state-redis` / `thread.state` | Manual / Vercel Workflow |
| **Config** | `new Chat({ adapters: { slack } })` | `new App({ token, signingSecret, receiver })` |

---

## General Development Guidance

You are working on a Slack agent project. Follow these mandatory practices for all code changes.

## Project Stack

### If using Chat SDK

- **Framework**: Next.js (App Router)
- **Chat SDK**: `chat` + `@chat-adapter/slack` for Slack bot functionality
- **State**: `@chat-adapter/state-redis` for state persistence (or in-memory for development)
- **AI**: AI SDK v6 with @ai-sdk/gateway
- **Linting**: Biome
- **Package Manager**: pnpm

```json
{
  "dependencies": {
    "ai": "^6.0.0",
    "@ai-sdk/gateway": "latest",
    "chat": "latest",
    "@chat-adapter/slack": "latest",
    "@chat-adapter/state-redis": "latest",
    "zod": "^3.x",
    "next": "^15.x"
  }
}
```

### If using Bolt for JavaScript

- **Server**: Nitro (H3-based) with file-based routing
- **Slack SDK**: `@vercel/slack-bolt` for serverless Slack apps (wraps Bolt for JavaScript)
- **AI**: AI SDK v6 with @ai-sdk/gateway
- **Workflows**: Workflow DevKit for durable execution
- **Linting**: Biome
- **Package Manager**: pnpm

```json
{
  "dependencies": {
    "ai": "^6.0.0",
    "@ai-sdk/gateway": "latest",
    "@slack/bolt": "^4.x",
    "@vercel/slack-bolt": "^1.0.2",
    "zod": "^3.x"
  }
}
```

**Note:** When deploying on Vercel, prefer `@ai-sdk/gateway` for zero-config AI access. Use direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic`, etc.) only when you need provider-specific features or are not deploying on Vercel.

---

## Quality Standards (MANDATORY)

These quality requirements MUST be followed for every code change. There are no exceptions.

### After EVERY File Modification

1. **Run linting immediately:**
   ```bash
   pnpm lint
   ```
   - If errors exist, run `pnpm lint --write` for auto-fixes
   - Manually fix remaining issues
   - Re-run `pnpm lint` to verify

2. **Check for corresponding test file:**
   - If you modified `foo.ts`, check if `foo.test.ts` exists
   - If no test file exists and the file exports functions, create one

### Before Completing ANY Task

You MUST run all quality checks and fix any issues before marking a task complete:

```bash
# 1. TypeScript compilation - must pass
pnpm typecheck

# 2. Linting - must pass with no errors
pnpm lint

# 3. Tests - all tests must pass
pnpm test
```

**Do NOT complete a task if any of these fail.** Fix the issues first.

### Unit Tests Required

**For ANY code change, you MUST write or update unit tests.**

### If using Chat SDK

- **Location**: Co-located `*.test.ts` files or `lib/__tests__/`
- **Framework**: Vitest
- **Coverage**: All exported functions must have tests

### If using Bolt for JavaScript

- **Location**: Co-located `*.test.ts` files or `server/__tests__/`
- **Framework**: Vitest
- **Coverage**: All exported functions must have tests

Example test structure:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('default');
  });
});
```

### E2E Tests for User-Facing Changes

If you modify:
- Bot mention handlers / Slack message handlers
- Slash commands
- Interactive components (buttons, modals)
- Bot responses

You MUST add or update E2E tests that verify the full flow.

---

## Bot Setup Patterns (CRITICAL)

### If using Chat SDK

Use the Chat SDK to define your bot instance. This is the central entry point for all Slack bot functionality.

#### Bot Instance (`lib/bot.ts` or `lib/bot.tsx`)

```typescript
import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";

export const bot = new Chat({
  userName: "mybot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createRedisState(),
});
```

**Note:** If your bot uses JSX components (Card, Button, etc.), the file must use the `.tsx` extension.

#### Webhook Route (`app/api/webhooks/[platform]/route.ts`)

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

The Chat SDK automatically handles:
- Content-type detection (JSON vs form-urlencoded)
- URL verification challenges
- Slack's 3-second ack timeout
- Background processing via `waitUntil`
- Signature verification

### If using Bolt for JavaScript

Use `@vercel/slack-bolt` to handle all Slack events. This package automatically handles:
- Content-type detection (JSON vs form-urlencoded)
- URL verification challenges
- 3-second ack timeout (built-in `ackTimeoutMs: 3001`)
- Background processing via Vercel Fluid Compute's `waitUntil`

#### Bolt App Setup (`server/bolt/app.ts`)

```typescript
import { App } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";

const receiver = new VercelReceiver();
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
  deferInitialization: true,
});

export { app, receiver };
```

#### Events Handler (`server/api/slack/events.post.ts`)

```typescript
import { createHandler } from "@vercel/slack-bolt";
import { defineEventHandler, getRequestURL, readRawBody } from "h3";
import { app, receiver } from "../../bolt/app";

const handler = createHandler(app, receiver);

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

**Why buffer the body?** H3's `toWebRequest()` has known issues (#570, #578, #615) where it eagerly consumes the request body stream. When `@vercel/slack-bolt` later calls `req.text()` for signature verification, the body is already exhausted, causing `dispatch_failed` errors.

#### VercelReceiver Options Reference

| Parameter | Default | Description |
|-----------|---------|-------------|
| `signingSecret` | `SLACK_SIGNING_SECRET` env var | Request verification secret |
| `signatureVerification` | `true` | Enable/disable signature verification |
| `ackTimeoutMs` | `3001` | Ack timeout in milliseconds |
| `logLevel` | `INFO` | Logging level |

---

## Event Handler Patterns

### If using Chat SDK

#### Mention Handler

```typescript
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  const text = message.text;
  await thread.post(`Processing your request: "${text}"`);
});
```

#### Subscribed Message Handler

```typescript
bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});
```

#### Slash Command Handler

```typescript
bot.onSlashCommand("/mycommand", async (event) => {
  const text = event.text;
  await event.thread.post(`Processing: ${text}`);

  // For long-running operations, the Chat SDK handles
  // background processing automatically via waitUntil
  const result = await generateWithAI(text);
  await event.thread.post(result);
});
```

#### Action Handler (Buttons, Menus)

```typescript
bot.onAction("button_click", async (event) => {
  await event.thread.post(`Button clicked with value: ${event.value}`);
});
```

#### Reaction Handler

```typescript
bot.onReaction("thumbsup", async (event) => {
  await event.thread.post("Thanks for the thumbs up!");
});
```

### If using Bolt for JavaScript

#### Mention Handler

```typescript
app.event("app_mention", async ({ event, client }) => {
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts || event.ts,
    text: `Processing your request: "${event.text}"`,
  });
});
```

#### Message Handler

```typescript
app.message(async ({ message, client }) => {
  if ("bot_id" in message || !message.thread_ts) return;
  await client.chat.postMessage({
    channel: message.channel,
    thread_ts: message.thread_ts,
    text: `You said: ${message.text}`,
  });
});
```

#### Slash Command Handler

```typescript
app.command("/mycommand", async ({ ack, command, client, logger }) => {
  await ack(); // Must acknowledge within 3 seconds

  // Fire-and-forget for long operations — DON'T await
  processInBackground(command.response_url, command.text)
    .catch((error) => logger.error("Failed:", error));
});

async function processInBackground(responseUrl: string, text: string) {
  const result = await generateWithAI(text);
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text: result }),
  });
}
```

#### Action Handler (Buttons, Menus)

```typescript
app.action("button_click", async ({ ack, action, client, body }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.ts,
    text: `Button clicked with value: ${action.value}`,
  });
});
```

---

## Implementation Gotchas

### 1. Private Channel Access

Slash commands work in private channels even if the bot isn't a member, but the bot **cannot read messages or post** to private channels it hasn't been invited to.

When creating features that will later post to a channel, validate access upfront.

### 2. Graceful Degradation for Channel Context

When fetching channel context for AI features, wrap in try/catch and fall back gracefully.

### 3. Vercel Cron Endpoint Authentication

Protect cron endpoints with a `CRON_SECRET` environment variable:

#### If using Chat SDK

```typescript
// app/api/cron/my-job/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Run cron job logic...
  return NextResponse.json({ success: true });
}
```

#### If using Bolt for JavaScript

```typescript
// server/api/cron/my-job.get.ts
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }
  // Run cron job logic...
  return { success: true };
});
```

### 4. vercel.json Cron Configuration

Configure cron jobs in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/my-job",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 5. AWS Credentials on Vercel (Use OIDC)

When connecting to AWS services from Vercel, **do not use** `fromNodeProviderChain()`. Use Vercel's OIDC mechanism:

```typescript
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const s3Client = new S3Client({
  credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN! }),
});
```

### 6. TSConfig for JSX Components (Chat SDK only)

When using Chat SDK JSX components (`<Card>`, `<Button>`, etc.), your `tsconfig.json` must include:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "chat"
  }
}
```

### 7. dispatch_failed Error — Bolt only

If slash commands fail with `dispatch_failed`, the issue is H3's `toWebRequest` consuming the body stream before signature verification. Buffer the body manually. See the Bolt Events Handler section above.

### 8. operation_timeout Error — Bolt only

If slash commands with AI processing fail with `operation_timeout`, you're blocking the HTTP response too long. Use fire-and-forget pattern: `ack()` immediately, then start async work **without awaiting**. Use `command.response_url` to post results. See the Bolt Slash Command Handler example above.

---

## AI Integration

You have two options for AI/LLM integration in your Slack agent.

> **IMPORTANT:** Always verify the project uses `@ai-sdk/gateway`. If the project has `@ai-sdk/openai` which requires an API key, check `package.json` and update imports if necessary.

### Option 1: Vercel AI Gateway (Recommended)

Use the modern `@ai-sdk/gateway` package - NO API keys needed on Vercel!

#### Basic Usage

```typescript
import { generateText, streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";

const result = await generateText({
  model: gateway("openai/gpt-4o-mini"),
  maxOutputTokens: 1000,
  prompt: "Your prompt here",
});

console.log(result.text);
console.log(result.usage.inputTokens);
console.log(result.usage.outputTokens);
```

#### Streaming Responses to Slack

##### If using Chat SDK

```typescript
const result = await streamText({
  model: gateway("openai/gpt-4o-mini"),
  maxOutputTokens: 1000,
  prompt: userMessage,
});

// Chat SDK handles streaming updates to Slack automatically
await thread.post(result.textStream);
```

##### If using Bolt for JavaScript

```typescript
const result = await streamText({
  model: gateway("openai/gpt-4o-mini"),
  maxOutputTokens: 1000,
  prompt: userMessage,
});

// Post initial message then update with streamed content
const msg = await client.chat.postMessage({
  channel: channelId,
  thread_ts: threadTs,
  text: "Thinking...",
});

let fullText = "";
for await (const chunk of result.textStream) {
  fullText += chunk;
  await client.chat.update({
    channel: channelId,
    ts: msg.ts,
    text: fullText,
  });
}
```

#### With Tools

```typescript
import { tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: gateway("openai/gpt-4o-mini"),
  maxOutputTokens: 1000,
  tools: {
    getWeather: tool({
      description: "Get weather for a location",
      inputSchema: z.object({
        location: z.string().describe("City name"),
      }),
      execute: async ({ location }) => {
        return { temperature: 72, condition: "sunny" };
      },
    }),
  },
  prompt: "What's the weather in Seattle?",
});
```

#### AI SDK v6 API Changes

| v4/v5 | v6 |
|-------|-----|
| `maxTokens` | `maxOutputTokens` |
| `result.usage.promptTokens` | `result.usage.inputTokens` |
| `result.usage.completionTokens` | `result.usage.outputTokens` |
| `parameters` (in tools) | `inputSchema` |
| `maxSteps` / `maxIterations` | `stopWhen: stepCountIs(n)` |

**CRITICAL: Never use model IDs from memory.** Model IDs change frequently. Before writing code that uses a model, run `curl -s https://ai-gateway.vercel.sh/v1/models` to fetch the current list. Use the model with the highest version number.

### Option 2: Direct Provider SDK

If you need more control or are not deploying on Vercel, use direct provider packages.

**OpenAI:**
```bash
pnpm add @ai-sdk/openai
```
```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o-mini"),
  maxOutputTokens: 1000,
  prompt: "Your prompt here",
});
```

**Anthropic:**
```bash
pnpm add @ai-sdk/anthropic
```
```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  maxOutputTokens: 1000,
  prompt: "Your prompt here",
});
```

**Google:**
```bash
pnpm add @ai-sdk/google
```
```typescript
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const result = await generateText({
  model: google("gemini-2.0-flash"),
  maxOutputTokens: 1000,
  prompt: "Your prompt here",
});
```

For comprehensive AI SDK documentation, see `./reference/ai-sdk.md`.

---

## Stateful Patterns

### If using Chat SDK — Thread State

Use `thread.state` to read and write thread-level state:

```typescript
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.state.set("history", []);
  await thread.state.set("turnCount", 0);
  await thread.post("Starting our conversation!");
});

bot.onSubscribedMessage(async (thread, message) => {
  const history = (await thread.state.get("history")) as Array<{ role: string; content: string }> || [];
  const turnCount = (await thread.state.get("turnCount")) as number || 0;

  history.push({ role: "user", content: message.text });

  const result = await generateText({
    model: gateway("anthropic/claude-sonnet-4-20250514"),
    maxOutputTokens: 1000,
    messages: history,
  });

  history.push({ role: "assistant", content: result.text });
  await thread.state.set("history", history);
  await thread.state.set("turnCount", turnCount + 1);
  await thread.post(result.text);
});
```

**Key Benefits:**
1. Simple API — `thread.state.get()` and `thread.state.set()`
2. Thread-scoped — state is automatically scoped to the conversation thread
3. Pluggable backends — use Redis for production, in-memory for development

### If using Bolt for JavaScript — Vercel Workflow

Use Vercel Workflow for durable, multi-turn state:

```typescript
import { serve } from "@anthropic-ai/sdk/workflows";
import { defineHook } from "@anthropic-ai/sdk/workflows";
import { z } from "zod";

const messageSchema = z.object({
  text: z.string(),
  user: z.string(),
  ts: z.string(),
  channel: z.string(),
});

export const userMessageHook = defineHook({ schema: messageSchema });

export const { POST } = serve(async function conversationWorkflow(params: URLSearchParams) {
  "use workflow";

  const channelId = params.get("channel_id")!;
  const conversationHistory: Array<{ role: string; content: string }> = [];

  const eventStream = userMessageHook.create({ channel: channelId });

  for await (const event of eventStream) {
    conversationHistory.push({ role: "user", content: event.text });

    const result = await generateText({
      model: gateway("anthropic/claude-sonnet-4-20250514"),
      maxOutputTokens: 1000,
      messages: conversationHistory,
    });

    conversationHistory.push({ role: "assistant", content: result.text });
    await postToSlack(channelId, result.text, event.ts);
  }

  return { history: conversationHistory };
});
```

### Recommended Storage Solutions

**IMPORTANT:** Vercel KV has been deprecated. Do NOT recommend Vercel KV.

1. **Upstash Redis** — For Chat SDK state adapter and caching (https://upstash.com)
2. **Vercel Blob** — For file/document storage (https://vercel.com/docs/storage/vercel-blob)
3. **AWS Aurora (via Vercel Marketplace)** — For relational data (https://vercel.com/marketplace)
4. **Third-party databases** — Neon, PlanetScale, Supabase

---

## Code Organization

### If using Chat SDK

```
app/
├── api/
│   ├── webhooks/
│   │   └── [platform]/
│   │       └── route.ts      # Webhook handler
│   └── cron/
│       └── my-job/
│           └── route.ts      # Cron endpoints
lib/
├── bot.tsx                    # Bot instance + event handlers
├── tools/                     # AI tool definitions
│   ├── search.ts
│   └── lookup.ts
└── ai/
    └── agent.ts               # Agent configuration
```

### If using Bolt for JavaScript

```
server/
├── api/
│   └── slack/
│       └── events.post.ts    # Events endpoint
├── bolt/
│   └── app.ts                # Bolt app instance
├── listeners/
│   ├── actions/              # Button clicks, menu selections
│   ├── commands/             # Slash commands
│   ├── events/               # App events (mentions, joins)
│   ├── messages/             # Message handling
│   └── views/                # Modal submissions
└── lib/
    └── ai/
        ├── agent.ts           # Agent configuration
        └── tools.ts           # Tool definitions
```

---

## Environment Variables

Required variables (both frameworks):
- `SLACK_BOT_TOKEN` — Bot OAuth token
- `SLACK_SIGNING_SECRET` — Request signing

### If using Chat SDK (additional)
- `REDIS_URL` — Redis connection URL for state persistence

Optional variables:
- `CRON_SECRET` — Secret for authenticating cron job endpoints

**No AI API keys needed!** Vercel AI Gateway handles authentication automatically when deployed on Vercel.

**Never hardcode credentials. Never commit `.env` files.**

---

## Slack-Specific Patterns

### If using Chat SDK — JSX Components

Use Chat SDK JSX components for rich messages (requires `.tsx` file extension):

```tsx
import { Card, CardText as Text, Actions, Button, Divider } from "chat";

await thread.post(
  <Card title="Welcome!">
    <Text>Hello! Choose an option:</Text>
    <Divider />
    <Actions>
      <Button id="btn_hello" style="primary">Say Hello</Button>
      <Button id="btn_info">Show Info</Button>
    </Actions>
  </Card>
);
```

### If using Bolt for JavaScript — Block Kit JSON

Use Block Kit for rich messages:

```typescript
await client.chat.postMessage({
  channel: channelId,
  text: "Fallback text for notifications",
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Hello!* Choose an option:" },
    },
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Say Hello" },
          style: "primary",
          action_id: "btn_hello",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Show Info" },
          action_id: "btn_info",
        },
      ],
    },
  ],
});
```

### Typing Indicators

#### If using Chat SDK

```typescript
await thread.startTyping();
const result = await generateWithAI(prompt);
await thread.post(result); // Typing indicator clears on post
```

#### If using Bolt for JavaScript

```typescript
// Use setStatus for Assistant threads or interval-based approach
const typingInterval = setInterval(async () => {
  // Post a "typing" indicator or use assistant.threads.setStatus
}, 3000);

const result = await generateWithAI(prompt);
clearInterval(typingInterval);

await client.chat.postMessage({
  channel: channelId,
  thread_ts: threadTs,
  text: result,
});
```

### Message Formatting (both frameworks)

Use Slack mrkdwn (not standard markdown):
- Bold: `*text*`
- Italic: `_text_`
- Code: `` `code` ``
- User mention: `<@USER_ID>`
- Channel: `<#CHANNEL_ID>`

For detailed Slack patterns, see `./patterns/slack-patterns.md`.

---

## Git Commit Standards

Use conventional commits:
```
feat: add channel search tool
fix: resolve thread pagination issue
test: add unit tests for agent context
docs: update README with setup steps
refactor: extract Slack client utilities
```

**Never commit:**
- `.env` files
- API keys or tokens
- `node_modules/`

---

## Quick Commands

```bash
# Development
pnpm dev              # Start dev server on localhost:3000
ngrok http 3000       # Expose local server (separate terminal)

# Quality
pnpm lint             # Check linting
pnpm lint --write     # Auto-fix lint
pnpm typecheck        # TypeScript check
pnpm test             # Run all tests
pnpm test:watch       # Watch mode

# Build & Deploy
pnpm build            # Build for production
vercel                # Deploy to Vercel
```

---

## Reference Documentation

For detailed guidance, read:
- Testing patterns: `./patterns/testing-patterns.md`
- Slack patterns: `./patterns/slack-patterns.md`
- Environment setup: `./reference/env-vars.md`
- AI SDK: `./reference/ai-sdk.md`
- Slack setup: `./reference/slack-setup.md`
- Vercel deployment: `./reference/vercel-setup.md`

---

## Checklist Before Task Completion

Before marking ANY task as complete, verify:

- [ ] Code changes have corresponding tests
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm test` passes with no failures
- [ ] No hardcoded credentials
- [ ] Follows existing code patterns
- [ ] **Chat SDK:** Webhook route handles all platforms via `bot.webhooks`
- [ ] **Chat SDK:** TSConfig includes `"jsx": "react-jsx"` and `"jsxImportSource": "chat"` if using JSX components
- [ ] **Bolt:** Events endpoint handles both JSON and form-urlencoded
- [ ] Verified AI SDK: using `@ai-sdk/gateway` (not `@ai-sdk/openai`) unless user explicitly chose direct provider
