import { defineConfig } from '@playwright/test';
import { loadEnvironment } from '../scripts/env.cjs';
import { assertDisposableEnvironment } from '../scripts/e2e-environment.cjs';

loadEnvironment();
assertDisposableEnvironment(process.env);

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env['GPET_E2E_URL'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
