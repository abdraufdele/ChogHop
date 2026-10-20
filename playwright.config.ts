import { defineConfig, devices } from '@playwright/test';

const hosted = process.env.CHOGHOP_E2E_STORAGE === 'supabase';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3000', ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    ...(!hosted ? [{ command: 'node e2e/support/rpc-server.mjs', url: 'http://127.0.0.1:54329/health', reuseExistingServer: false, timeout: 60_000 }] : []),
    {
      command: 'npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: false, timeout: 60_000,
      env: hosted ? { CHOGHOP_ENVIRONMENT: 'test' } : { SUPABASE_URL: 'http://127.0.0.1:54329', SUPABASE_SERVICE_ROLE_KEY: 'choghop-test-key', CHOGHOP_ENVIRONMENT: 'test' },
    },
  ],
});
