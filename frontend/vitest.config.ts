import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: {
      VITE_API_BASE_URL: '/api/v1',
      VITE_APP_NAME: 'Matchplay',
      VITE_APP_URL: 'http://localhost:5173',
      VITE_DEFAULT_LOCALE: 'es',
      VITE_SUPPORTED_LOCALES: 'es,en',
      VITE_ENV: 'development',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/mocks/**',
        'src/test/**',
        'src/types/**',
        '**/*.config.*',
        'src/**/*.types.ts',
      ],
    },
  },
})
