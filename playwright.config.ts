import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5178',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    // Traces can contain request credentials; keep them disabled.
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: 'https://tenant.test',
      VITE_LOGIN_OWNER_EMAIL: 'owner@example.test',
      VITE_LOGIN_MANAGER_EMAIL: 'manager@example.test',
      VITE_LOGIN_STAFF_EMAIL: 'staff@example.test',
      VITE_LOGIN_PASSWORD: 'fixture-only',
    },
  },
})
