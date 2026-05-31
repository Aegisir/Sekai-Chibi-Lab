import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

import { fileURLToPath } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
