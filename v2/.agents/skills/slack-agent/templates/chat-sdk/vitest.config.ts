import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals (describe, it, expect) without imports
    globals: true,

    // Node environment for server-side code
    environment: 'node',

    // Test file patterns
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'app/**/*.test.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'lib/**/*.tsx', 'app/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/**/*.test.tsx',
        'lib/**/*.d.ts',
        'lib/__tests__/**',
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
    setupFiles: ['./lib/__tests__/setup.ts'],

    // Timeout for async operations (ms)
    testTimeout: 10000,

    // Retry failed tests (useful for flaky network tests)
    retry: 0,

    // Reporter configuration
    reporters: ['verbose'],
  },
});
