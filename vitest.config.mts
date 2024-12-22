import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'coverage/',
        '**/*.test.ts'
      ]
    },
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json'
    },
    setupFiles: [],
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
});
