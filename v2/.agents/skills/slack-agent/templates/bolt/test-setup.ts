/**
 * Global test setup file
 * This runs before each test file
 */
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ============================================
// Environment Variables
// ============================================

// Stub environment variables for tests
vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token-12345');
vi.stubEnv('SLACK_SIGNING_SECRET', 'test-signing-secret-abc123');
vi.stubEnv('AI_GATEWAY_API_KEY', 'test-ai-gateway-key');
vi.stubEnv('NODE_ENV', 'test');

// ============================================
// Global Mocks
// ============================================

// Mock Slack Web API
vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => createMockSlackClient()),
}));

// Mock Slack Bolt (if needed)
vi.mock('@slack/bolt', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Add any specific Bolt mocks here
  };
});

// ============================================
// Mock Factories
// ============================================

export function createMockSlackClient() {
  return {
    conversations: {
      history: vi.fn().mockResolvedValue({
        ok: true,
        messages: [],
        has_more: false,
      }),
      replies: vi.fn().mockResolvedValue({
        ok: true,
        messages: [],
        has_more: false,
      }),
      join: vi.fn().mockResolvedValue({
        ok: true,
        channel: { id: 'C12345678' },
      }),
      list: vi.fn().mockResolvedValue({
        ok: true,
        channels: [],
      }),
      info: vi.fn().mockResolvedValue({
        ok: true,
        channel: { id: 'C12345678', name: 'general' },
      }),
    },
    chat: {
      postMessage: vi.fn().mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C12345678',
      }),
      update: vi.fn().mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
      }),
      delete: vi.fn().mockResolvedValue({
        ok: true,
      }),
    },
    users: {
      info: vi.fn().mockResolvedValue({
        ok: true,
        user: {
          id: 'U12345678',
          name: 'testuser',
          real_name: 'Test User',
        },
      }),
    },
    reactions: {
      add: vi.fn().mockResolvedValue({ ok: true }),
      remove: vi.fn().mockResolvedValue({ ok: true }),
    },
    assistant: {
      threads: {
        setStatus: vi.fn().mockResolvedValue({ ok: true }),
        setSuggestedPrompts: vi.fn().mockResolvedValue({ ok: true }),
      },
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
  const baseEvent = {
    type,
    user: 'U12345678',
    channel: 'C12345678',
    ts: '1234567890.123456',
    event_ts: '1234567890.123456',
    ...overrides,
  };

  return baseEvent;
}

// ============================================
// Test Lifecycle Hooks
// ============================================

beforeAll(() => {
  // Global setup before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('Test suite complete.');
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// ============================================
// Custom Matchers (optional)
// ============================================

// Add custom matchers if needed
// expect.extend({
//   toBeValidSlackMessage(received) {
//     const pass = received && typeof received.text === 'string';
//     return {
//       pass,
//       message: () => `expected ${received} to be a valid Slack message`,
//     };
//   },
// });
