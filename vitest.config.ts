// Unit tests (Vitest), closing GAP-014. `npm test` runs them once.
// Test names carry their spec test-case IDs (TC-…), as AGENTS.md requires.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
