import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals (describe, it, expect) without imports
    globals: true,

    // Node environment for server-side code
    environment: 'node',

    // Test file patterns
    include: [
      'server/**/*.test.ts',
      'server/**/*.test.tsx',
      'server/**/*.e2e.test.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      '.nitro',
      '.output',
      'dist',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/**/*.test.ts',
        'server/**/*.d.ts',
        'server/**/__tests__/**',
      ],
      // Coverage thresholds (adjust as needed)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },

    // Setup files run before each test file
    setupFiles: ['./server/__tests__/setup.ts'],

    // Timeout for async operations (ms)
    testTimeout: 10000,

    // Retry failed tests (useful for flaky network tests)
    retry: 0,

    // Reporter configuration
    reporters: ['verbose'],
  },
});
