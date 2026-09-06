import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: { baseURL: 'http://localhost:4201', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/e2e/serve-dist.mjs', url: 'http://localhost:4201', reuseExistingServer: !process.env['CI'] },
});
