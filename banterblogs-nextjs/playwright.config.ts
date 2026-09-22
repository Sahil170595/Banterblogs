import { defineConfig } from '@playwright/test';

// Route and visual checks against a production build (`next build` first).
// Playwright starts `next start` itself unless E2E_BASE_URL points at a
// server that is already running. See e2e/README.md.

const DEFAULT_PORT = 3100;
const PORT = Number(process.env.E2E_PORT ?? DEFAULT_PORT);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const IN_CI = Boolean(process.env.CI);
// a cold `next start` of the prerendered site is up in a few seconds
const SERVER_START_TIMEOUT_MS = 120_000;
// one retry in CI absorbs a cold-start stall without hiding a real failure
const CI_RETRIES = 1;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

export default defineConfig({
  testDir: './e2e',
  // the platform stays in the name, so baselines from the CI image (linux)
  // are never compared with a local Windows or macOS render
  snapshotPathTemplate: '{testDir}/__snapshots__/{projectName}/{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: IN_CI,
  retries: IN_CI ? CI_RETRIES : 0,
  reporter: IN_CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: DESKTOP } },
    {
      name: 'phone',
      use: { browserName: 'chromium', viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -H 127.0.0.1 -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !IN_CI,
        timeout: SERVER_START_TIMEOUT_MS,
      },
});
