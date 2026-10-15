import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, raiz, '');

  return {
    resolve: {
      alias: { '@': raiz }, 
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      testTimeout: 30_000, 
      env: {
        JWT_SECRET: 'secreto-solo-para-tests-0123456789abcdef',
        TEST_DATABASE_URL: env.TEST_DATABASE_URL ?? '',
      },
    },
  };
});
