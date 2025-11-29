import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(import.meta.dirname, 'client', 'src', '__tests__', 'setupTests.ts')],
    include: ['client/src/**/*.test.ts', 'client/src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  esbuild: {
    tsconfig: path.resolve(import.meta.dirname, 'tsconfig.vitest.json'),
  },
});
