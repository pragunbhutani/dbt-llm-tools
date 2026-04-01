# Slack Development Patterns

This document covers Slack-specific patterns and best practices for building agents with either the Chat SDK or Bolt for JavaScript.

## Rich UI

### If using Chat SDK — JSX Components

Chat SDK uses JSX components instead of raw Block Kit JSON. Files using JSX must have the `.tsx` extension.

```tsx
import { Card, CardText as Text, Actions, Button, Divider } from "chat";

await thread.post(
  <Card title="Hello!">
    <Text>*Hello!* This is a formatted message.</Text>
    <Divider />
    <Text>Choose an option:</Text>
    <Actions>
      <Button id="button_click" value="button_value" style="primary">Click Me</Button>
    </Actions>
  </Card>
);
```

#### Interactive Actions (Chat SDK)

```tsx
import { Card, CardText as Text, Actions, Button, Select, Option } from "chat";

// Button with danger style
await thread.post(
  <Card>
    <Text>Are you sure you want to delete this?</Text>
    <Actions>
      <Button id="delete_item" value={itemId} style="danger">Delete</Button>
      <Button id="cancel">Cancel</Button>
    </Actions>
  </Card>
);

// Select menu
await thread.post(
  <Card>
    <Text>Select an option:</Text>
    <Actions>
      <Select id="select_option" placeholder="Choose...">
        <Option value="opt1">Option 1</Option>
        <Option value="opt2">Option 2</Option>
      </Select>
    </Actions>
  </Card>
);
```

### If using Bolt for JavaScript — Block Kit JSON

```typescript
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

await client.chat.postMessage({
  channel: channelId,
  text: 'Fallback text for notifications', // Required for accessibility
  blocks: [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Hello!* This is a formatted message.' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Choose an option:' },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Click Me' },
        action_id: 'button_click',
        value: 'button_value',
      },
    },
  ],
});
```

#### Interactive Actions (Bolt)

```typescript
// Button with confirmation
{
  type: 'button',
  text: { type: 'plain_text', text: 'Delete' },
  style: 'danger',
  action_id: 'delete_item',
  value: itemId,
  confirm: {
    title: { type: 'plain_text', text: 'Confirm Delete' },
    text: { type: 'mrkdwn', text: 'Are you sure you want to delete this?' },
    confirm: { type: 'plain_text', text: 'Delete' },
    deny: { type: 'plain_text', text: 'Cancel' },
  },
}

// Select menu
{
  type: 'static_select',
  placeholder: { type: 'plain_text', text: 'Select an option' },
  action_id: 'select_option',
  options: [
    { text: { type: 'plain_text', text: 'Option 1' }, value: 'opt1' },
    { text: { type: 'plain_text', text: 'Option 2' }, value: 'opt2' },
  ],
}
```

#### Context and Header Blocks (Bolt)

```typescript
// Header
{ type: 'header', text: { type: 'plain_text', text: 'Task Summary' } }

// Context (small text, often for metadata)
{
  type: 'context',
  elements: [
    { type: 'mrkdwn', text: 'Created by <@U12345678>' },
    { type: 'mrkdwn', text: '|' },
    { type: 'mrkdwn', text: '<!date^1234567890^{date_short}|Jan 1, 2024>' },
  ],
}
```

---

## Message Formatting (mrkdwn)

Slack uses its own markdown variant called mrkdwn. This applies to both frameworks.

### Text Formatting
```
*bold text*
_italic text_
~strikethrough~
`inline code`
```code block```
> blockquote
```

### Links and Mentions
```
<https://example.com|Link Text>
<@U12345678>              # User mention
<#C12345678>              # Channel link
<!here>                   # @here mention
<!channel>                # @channel mention
<!date^1234567890^{date_short}|fallback>  # Date formatting
```

### Lists
```
Slack doesn't support markdown lists, use:
* Bullet point (use the actual bullet character)
1. Numbered manually
```

---

## Webhook / Events Endpoint

### If using Chat SDK

```typescript
// app/api/webhooks/[platform]/route.ts
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
- Signature verification using `SLACK_SIGNING_SECRET`

### If using Bolt for JavaScript

```typescript
// server/bolt/app.ts
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

```typescript
// server/api/slack/events.post.ts
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

**Why buffer the body?** H3's `toWebRequest()` eagerly consumes the request body stream, causing `dispatch_failed` errors on serverless platforms.

### Content Type Reference (both frameworks)

| Event Type | Content-Type | Handled Automatically |
|------------|--------------|----------------------|
| Slash commands | `application/x-www-form-urlencoded` | Yes |
| Events API | `application/json` | Yes |
| Interactivity | `application/json` | Yes |
| URL verification | `application/json` | Yes |

---

## Event Handling Patterns

### Mention Handler

#### If using Chat SDK

```typescript
bot.onNewMention(async (thread, message) => {
  try {
    const text = message.text; // Mention prefix already stripped
    await thread.subscribe();
    await thread.post(`Processing your request: "${text}"`);
    // Process with agent...
  } catch (error) {
    console.error("Error handling mention:", error);
    await thread.post("Sorry, I encountered an error processing your request.");
  }
});
```

#### If using Bolt for JavaScript

```typescript
app.event('app_mention', async ({ event, client, say }) => {
  try {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const thread_ts = event.thread_ts || event.ts;

    await say({
      text: `Processing your request: "${text}"`,
      thread_ts,
    });
    // Process with agent...
  } catch (error) {
    console.error('Error handling mention:', error);
    await say({
      text: 'Sorry, I encountered an error processing your request.',
      thread_ts: event.thread_ts || event.ts,
    });
  }
});
```

### Subscribed / Follow-up Message Handler

#### If using Chat SDK

```typescript
bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});
```

#### If using Bolt for JavaScript

```typescript
app.message(async ({ message, say }) => {
  if ('bot_id' in message) return;
  if ('subtype' in message && message.subtype === 'message_changed') return;
  if (message.channel_type !== 'im' && !message.thread_ts) return;

  await say({
    text: `You said: ${message.text}`,
    thread_ts: message.thread_ts,
  });
});
```

### Slash Command Handler

#### If using Chat SDK

```typescript
bot.onSlashCommand("/sample-command", async (event) => {
  try {
    // Chat SDK handles ack and background processing automatically
    await event.thread.startTyping();
    const result = await processCommand(event.text);
    await event.thread.post(`Result: ${result}`);
  } catch (error) {
    await event.thread.post("Sorry, something went wrong.");
  }
});
```

**No fire-and-forget pattern needed.** The Chat SDK acknowledges the request immediately and processes the handler in the background.

#### If using Bolt for JavaScript

```typescript
app.command('/sample-command', async ({ command, ack, respond }) => {
  await ack(); // Always acknowledge within 3 seconds

  try {
    const result = await processCommand(command.text);
    await respond({
      response_type: 'ephemeral',
      text: `Result: ${result}`,
    });
  } catch (error) {
    await respond({
      response_type: 'ephemeral',
      text: 'Sorry, something went wrong.',
    });
  }
});
```

### Long-Running Slash Commands (AI, API calls)

#### If using Chat SDK

```typescript
bot.onSlashCommand("/ai-command", async (event) => {
  await event.thread.startTyping();
  // This can take as long as needed - Chat SDK handles the ack automatically
  const result = await generateWithAI(event.text);
  await event.thread.post(result);
});
```

#### If using Bolt for JavaScript

**CRITICAL:** Use fire-and-forget to avoid `operation_timeout` errors.

```typescript
app.command('/ai-command', async ({ ack, command, logger }) => {
  await ack(); // Must happen first

  // Fire-and-forget: DON'T await
  processInBackground(command.response_url, command.text, logger)
    .catch((error) => logger.error("Background processing failed:", error));
});

async function processInBackground(responseUrl: string, text: string, logger: Logger) {
  try {
    const result = await generateWithAI(text);
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: "in_channel", text: result }),
    });
  } catch (error) {
    logger.error("AI processing failed:", error);
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: "ephemeral", text: "Sorry, something went wrong." }),
    });
  }
}
```

**Bolt slash command patterns:**

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Sync** (`await ack({ text })`) | Instant responses | `/help`, `/status` |
| **Async** (`await ack()` + `await respond()`) | Quick operations (<3 sec) | `/search keyword` |
| **Fire-and-forget** (`await ack()` + no await) | AI/LLM, slow APIs | `/generate`, `/analyze` |

---

## Action Handlers

### If using Chat SDK

```typescript
bot.onAction("button_click", async (event) => {
  await event.thread.post(`You clicked: ${event.value}`);
});

bot.onAction("select_option", async (event) => {
  await event.thread.post(`You selected: ${event.value}`);
});
```

### If using Bolt for JavaScript

```typescript
app.action('button_click', async ({ body, ack, client }) => {
  await ack();
  const buttonValue = body.actions[0].value;
  await client.chat.update({
    channel: body.channel.id,
    ts: body.message.ts,
    text: 'Updated message',
    blocks: [/* new blocks */],
  });
});

app.action('select_option', async ({ body, ack }) => {
  await ack();
  const selectedValue = body.actions[0].selected_option.value;
  // Handle selection...
});
```

---

## Modal Patterns

### If using Chat SDK

```tsx
import { Modal, TextInput } from "chat";

// Opening a modal
bot.onSlashCommand("/open-form", async (event) => {
  await event.openModal(
    <Modal title="My Modal" submitLabel="Submit" callbackId="modal_submit">
      <TextInput id="input_value" label="Your Input" placeholder="Enter something..." />
    </Modal>
  );
});

// Handling submission
bot.onAction("modal_submit", async (event) => {
  const inputValue = event.values?.input_value;
  if (!inputValue || inputValue.length < 3) {
    return { errors: { input_value: "Please enter at least 3 characters" } };
  }
  await event.thread.post(`You submitted: ${inputValue}`);
});
```

### If using Bolt for JavaScript

```typescript
// Opening a modal
app.shortcut('open_modal', async ({ shortcut, ack, client }) => {
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'modal_submit',
      title: { type: 'plain_text', text: 'My Modal' },
      submit: { type: 'plain_text', text: 'Submit' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'input_block',
          label: { type: 'plain_text', text: 'Your Input' },
          element: {
            type: 'plain_text_input',
            action_id: 'input_value',
            placeholder: { type: 'plain_text', text: 'Enter something...' },
          },
        },
      ],
    },
  });
});

// Handling submission
app.view('modal_submit', async ({ ack, body, view, client }) => {
  const inputValue = view.state.values.input_block.input_value.value;
  if (!inputValue || inputValue.length < 3) {
    await ack({
      response_action: 'errors',
      errors: { input_block: 'Please enter at least 3 characters' },
    });
    return;
  }
  await ack();
  await client.chat.postMessage({
    channel: body.user.id,
    text: `You submitted: ${inputValue}`,
  });
});
```

---

## Thread Management

### If using Chat SDK

```typescript
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.post("I'm listening! Send me follow-up messages in this thread.");
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`Got your message: ${message.text}`);
});
```

### If using Bolt for JavaScript

```typescript
// Always reply in the same thread
const thread_ts = event.thread_ts || event.ts;
await say({ text: 'Response message', thread_ts });

// Broadcasting thread replies
await client.chat.postMessage({
  channel: channelId,
  thread_ts: parentTs,
  text: 'Important update!',
  reply_broadcast: true, // Also posts to channel
});
```

---

## Typing Indicators

### If using Chat SDK

```typescript
bot.onNewMention(async (thread, message) => {
  await thread.startTyping();
  const result = await processWithAI(message.text);
  await thread.post(result); // Typing clears automatically
});
```

The Chat SDK handles typing indicator refresh and timeout automatically.

### If using Bolt for JavaScript

Slack's typing indicator expires after **30 seconds**. Refresh for long operations:

```typescript
async function withTypingIndicator<T>(
  client: WebClient,
  channelId: string,
  threadTs: string,
  status: string,
  operation: () => Promise<T>
): Promise<T> {
  await client.assistant.threads.setStatus({
    channel_id: channelId,
    thread_ts: threadTs,
    status,
  });

  const refreshInterval = setInterval(async () => {
    await client.assistant.threads.setStatus({
      channel_id: channelId,
      thread_ts: threadTs,
      status,
    });
  }, 25000);

  try {
    return await operation();
  } finally {
    clearInterval(refreshInterval);
  }
}
```

Status message examples: `'is thinking...'`, `'is researching...'`, `'is writing...'`, `'is analyzing...'`

---

## Error Handling

### If using Chat SDK

```typescript
bot.onNewMention(async (thread, message) => {
  try {
    await processMessage(thread, message);
  } catch (error) {
    console.error("Operation failed:", error);
    let userMessage = "Something went wrong. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("channel_not_found")) {
        userMessage = "I don't have access to that channel.";
      } else if (error.message.includes("not_in_channel")) {
        userMessage = "Please invite me to the channel first.";
      }
    }
    await thread.post(userMessage);
  }
});
```

### If using Bolt for JavaScript

```typescript
async function handleWithErrorRecovery(
  operation: () => Promise<void>,
  say: SayFn,
  thread_ts?: string
) {
  try {
    await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    let userMessage = 'Something went wrong. Please try again.';
    if (error instanceof SlackAPIError) {
      if (error.code === 'channel_not_found') {
        userMessage = "I don't have access to that channel.";
      } else if (error.code === 'not_in_channel') {
        userMessage = 'Please invite me to the channel first.';
      }
    }
    await say({ text: userMessage, thread_ts });
  }
}
```

#### Rate Limiting (Bolt)

```typescript
import pRetry from 'p-retry';

async function sendMessageWithRetry(client: WebClient, options: ChatPostMessageArguments) {
  return pRetry(
    () => client.chat.postMessage(options),
    {
      retries: 3,
      onFailedAttempt: (error) => {
        if (error.code === 'rate_limited') {
          console.log(`Rate limited. Retrying after ${error.retryAfter || 1}s`);
        }
      },
    }
  );
}
```

---

## Best Practices Summary

**Both frameworks:**
1. **Handle errors gracefully** with user-friendly messages
2. **Use ephemeral messages** for sensitive or temporary information
3. **Log errors** with context for debugging
4. **Use threads** to keep channels clean

**Chat SDK specific:**
5. **Subscribe to threads** with `thread.subscribe()` for follow-up conversations
6. **Use JSX components** for rich messages instead of raw Block Kit JSON
7. **Use typing indicators** with `thread.startTyping()`
8. **Let Chat SDK handle ack** — no manual acknowledgment needed
9. **Use `.tsx` extension** for files with JSX components
10. **Configure tsconfig.json** with `"jsxImportSource": "chat"`

**Bolt specific:**
5. **Always acknowledge** within 3 seconds for interactive elements
6. **Provide fallback text** in all Block Kit messages
7. **Respect rate limits** with exponential backoff
8. **Buffer request body** in events handler to avoid H3 stream issues
9. **Use fire-and-forget** for slash commands with AI/long operations (>3 sec)
10. **Use `reply_broadcast: true`** for important thread replies
