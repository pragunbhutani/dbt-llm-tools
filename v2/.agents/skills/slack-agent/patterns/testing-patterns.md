# Testing Patterns for Slack Agents

This document provides detailed testing patterns for Slack agent projects built with either the Chat SDK or Bolt for JavaScript.

## Test File Organization

### If using Chat SDK

```
lib/
├── __tests__/
│   ├── setup.ts              # Global test setup and mocks
│   └── helpers/
│       ├── mock-context.ts   # Shared context mocks
│       └── mock-thread.ts    # Chat SDK thread mocks
├── bot.tsx                   # Bot instance
├── bot.test.ts               # Bot handler tests
├── ai/
│   ├── agent.ts
│   ├── agent.test.ts         # Unit tests (co-located)
│   └── tools/
│       ├── search.ts
│       └── search.test.ts
app/
├── api/
│   └── webhooks/
│       └── [platform]/
│           └── route.ts
```

Template files: `./templates/chat-sdk/`

### If using Bolt for JavaScript

```
server/
├── __tests__/
│   ├── setup.ts              # Global test setup and mocks
│   └── helpers/
│       ├── mock-client.ts    # Slack WebClient mocks
│       └── mock-context.ts   # Bolt context mocks
├── bolt/
│   └── app.ts
├── listeners/
│   ├── events/
│   │   ├── app-mention.ts
│   │   └── app-mention.test.ts
│   └── commands/
│       ├── sample-command.ts
│       └── sample-command.test.ts
└── lib/
    └── ai/
        ├── agent.ts
        ├── agent.test.ts
        └── tools.ts
        └── tools.test.ts
```

Template files: `./templates/bolt/`

---

## Unit Testing Tools

### Testing a Tool Definition

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChannelMessages } from './tools';

describe('getChannelMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch messages from channel', async () => {
    const result = await getChannelMessages.execute({
      channel_id: 'C12345678',
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe('Hello');
  });

  it('should handle empty channel', async () => {
    const result = await getChannelMessages.execute({
      channel_id: 'C_EMPTY',
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    const result = await getChannelMessages.execute({
      channel_id: 'C_INVALID',
      limit: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('channel_not_found');
  });
});
```

---

## Testing Bot / Event Handlers

### If using Chat SDK

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockThread, createMockMessage } from './helpers/mock-thread';

describe('bot.onNewMention', () => {
  it('should respond to mention and subscribe', async () => {
    const thread = createMockThread();
    const message = createMockMessage({ text: 'hello' });

    await handleMention(thread, message);

    expect(thread.subscribe).toHaveBeenCalled();
    expect(thread.post).toHaveBeenCalled();
  });

  it('should handle mention in thread', async () => {
    const thread = createMockThread({ threadTs: '123.400' });
    const message = createMockMessage({ text: 'help' });

    await handleMention(thread, message);

    expect(thread.post).toHaveBeenCalled();
  });
});
```

### If using Bolt for JavaScript

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockSlackClient, createMockEvent } from './helpers/mock-client';

describe('app_mention handler', () => {
  it('should respond to mention in thread', async () => {
    const client = createMockSlackClient();
    const event = createMockEvent('app_mention', {
      text: '<@U12345678> hello',
      channel: 'C12345678',
      ts: '123.456',
    });

    await handleAppMention({ event, client, say: vi.fn() });

    expect(client.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'C12345678',
        thread_ts: '123.456',
      })
    );
  });
});
```

---

## Testing Slash Commands

### If using Chat SDK

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockSlashCommandEvent } from './helpers/mock-thread';

describe('/sample-command', () => {
  it('should process command and respond', async () => {
    const event = createMockSlashCommandEvent({
      text: 'test input',
      userId: 'U12345678',
    });

    await handleSampleCommand(event);

    expect(event.thread.post).toHaveBeenCalledWith(
      expect.stringContaining('Result')
    );
  });

  it('should handle errors gracefully', async () => {
    const event = createMockSlashCommandEvent({ text: '' });

    await handleSampleCommand(event);

    expect(event.thread.post).toHaveBeenCalledWith(
      expect.stringContaining('went wrong')
    );
  });
});
```

### If using Bolt for JavaScript

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('/sample-command', () => {
  it('should ack and respond', async () => {
    const ack = vi.fn();
    const respond = vi.fn();
    const command = {
      text: 'test input',
      user_id: 'U12345678',
      channel_id: 'C12345678',
      response_url: 'https://hooks.slack.com/commands/...',
    };

    await handleSampleCommand({ ack, command, respond });

    expect(ack).toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Result') })
    );
  });
});
```

---

## Testing Action Handlers

### If using Chat SDK

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockActionEvent } from './helpers/mock-thread';

describe('button_click action', () => {
  it('should handle button click', async () => {
    const event = createMockActionEvent({
      actionId: 'button_click',
      value: 'clicked_value',
    });

    await handleButtonClick(event);

    expect(event.thread.post).toHaveBeenCalled();
  });
});
```

### If using Bolt for JavaScript

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('button_click action', () => {
  it('should ack and handle click', async () => {
    const ack = vi.fn();
    const client = createMockSlackClient();
    const body = {
      actions: [{ value: 'clicked_value' }],
      channel: { id: 'C12345678' },
      message: { ts: '123.456' },
    };

    await handleButtonClick({ ack, body, client });

    expect(ack).toHaveBeenCalled();
    expect(client.chat.update).toHaveBeenCalled();
  });
});
```

---

## E2E Testing Patterns

### Full Message Flow (Chat SDK)

```typescript
describe('E2E: Message Flow', () => {
  it('should handle complete mention flow', async () => {
    const thread = createMockThread();
    const message = createMockMessage({ text: 'what channels am I in?' });

    await handleMention(thread, message);

    expect(thread.subscribe).toHaveBeenCalled();
    expect(thread.post).toHaveBeenCalled();
  });

  it('should handle conversation in thread', async () => {
    const thread = createMockThread({ threadTs: '100.001' });

    const mention = createMockMessage({ text: 'start a task' });
    await handleMention(thread, mention);

    const followUp = createMockMessage({ text: 'continue please' });
    await handleSubscribedMessage(thread, followUp);

    expect(thread.post).toHaveBeenCalledTimes(2);
  });
});
```

### Full Message Flow (Bolt)

```typescript
describe('E2E: Message Flow', () => {
  it('should handle mention and reply in thread', async () => {
    const client = createMockSlackClient();
    const event = createMockEvent('app_mention', {
      text: '<@UBOT> what channels am I in?',
      channel: 'C12345678',
      ts: '100.001',
    });

    await handleAppMention({ event, client, say: vi.fn() });

    expect(client.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ thread_ts: '100.001' })
    );
  });
});
```

---

## Mock Helpers

### Chat SDK Mock Factories

```typescript
// lib/__tests__/helpers/mock-thread.ts
import { vi } from 'vitest';

export function createMockThread(overrides = {}) {
  return {
    post: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    startTyping: vi.fn().mockResolvedValue(undefined),
    state: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    },
    channelId: 'C12345678',
    threadTs: undefined,
    ...overrides,
  };
}

export function createMockMessage(overrides = {}) {
  return {
    text: 'test message',
    userId: 'U12345678',
    ts: '1234567890.123456',
    ...overrides,
  };
}

export function createMockSlashCommandEvent(overrides = {}) {
  return {
    text: '',
    userId: 'U12345678',
    channelId: 'C12345678',
    thread: createMockThread(),
    openModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockActionEvent(overrides = {}) {
  return {
    actionId: '',
    value: '',
    userId: 'U12345678',
    thread: createMockThread(),
    ...overrides,
  };
}
```

### Bolt Mock Factories

```typescript
// server/__tests__/helpers/mock-client.ts
import { vi } from 'vitest';

export function createMockSlackClient() {
  return {
    conversations: {
      history: vi.fn().mockResolvedValue({ ok: true, messages: [], has_more: false }),
      replies: vi.fn().mockResolvedValue({ ok: true, messages: [], has_more: false }),
      join: vi.fn().mockResolvedValue({ ok: true, channel: { id: 'C12345678' } }),
      list: vi.fn().mockResolvedValue({ ok: true, channels: [] }),
      info: vi.fn().mockResolvedValue({ ok: true, channel: { id: 'C12345678', name: 'general' } }),
    },
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true, ts: '1234567890.123456', channel: 'C12345678' }),
      update: vi.fn().mockResolvedValue({ ok: true, ts: '1234567890.123456' }),
      delete: vi.fn().mockResolvedValue({ ok: true }),
    },
    users: {
      info: vi.fn().mockResolvedValue({ ok: true, user: { id: 'U12345678', name: 'testuser' } }),
    },
    reactions: {
      add: vi.fn().mockResolvedValue({ ok: true }),
      remove: vi.fn().mockResolvedValue({ ok: true }),
    },
    views: {
      open: vi.fn().mockResolvedValue({ ok: true }),
      update: vi.fn().mockResolvedValue({ ok: true }),
      push: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
}

export function createMockContext(overrides = {}) {
  return {
    channel_id: 'C12345678',
    dm_channel: 'D12345678',
    thread_ts: undefined,
    is_dm: false,
    team_id: 'T12345678',
    user_id: 'U12345678',
    ...overrides,
  };
}

export function createMockEvent(type: string, overrides = {}) {
  return {
    type,
    user: 'U12345678',
    channel: 'C12345678',
    ts: '1234567890.123456',
    event_ts: '1234567890.123456',
    ...overrides,
  };
}
```

---

## Test Coverage Guidelines

Aim for these coverage targets (both frameworks):

| Category | Target |
|----------|--------|
| Tools | 90%+ |
| Agent logic | 85%+ |
| Event handlers | 80%+ |
| Utilities | 90%+ |
| Overall | 80%+ |

Run coverage report:
```bash
pnpm test:coverage
```
