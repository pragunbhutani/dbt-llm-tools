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
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('NODE_ENV', 'test');

// ============================================
// Global Mocks
// ============================================

// Mock Chat SDK
vi.mock('chat', () => ({
  Chat: vi.fn().mockImplementation(() => ({
    onNewMention: vi.fn(),
    onSubscribedMessage: vi.fn(),
    onSlashCommand: vi.fn(),
    onAction: vi.fn(),
    onReaction: vi.fn(),
    webhooks: {
      slack: vi.fn(),
    },
  })),
  Card: vi.fn(),
  CardText: vi.fn(),
  Actions: vi.fn(),
  Button: vi.fn(),
  Divider: vi.fn(),
  Modal: vi.fn(),
  TextInput: vi.fn(),
  Select: vi.fn(),
  Option: vi.fn(),
}));

// Mock Slack adapter
vi.mock('@chat-adapter/slack', () => ({
  createSlackAdapter: vi.fn().mockReturnValue({}),
}));

// Mock Redis state adapter
vi.mock('@chat-adapter/state-redis', () => ({
  createRedisState: vi.fn().mockReturnValue({}),
}));

// ============================================
// Mock Factories
// ============================================

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
    values: {},
    ...overrides,
  };
}

export function createMockContext(overrides = {}) {
  return {
    channel_id: 'C12345678',
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
