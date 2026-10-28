import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/web/src/i18n/**/*.test.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**']
  }
});
