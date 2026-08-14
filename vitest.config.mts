import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the `@/*` alias straight from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
