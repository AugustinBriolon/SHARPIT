import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/**
 * These specs assert what a navigation shows *before* the network answers, so
 * they only mean anything against a production server: `next dev` disables
 * prefetching, and without a prefetched shell `instant()` has nothing to freeze.
 * The webServer below therefore builds and starts the app rather than running
 * the dev server.
 *
 * Hidden Activity content stays in the DOM under Cache Components, so prefer
 * `getByRole` / `getByLabel` in these tests — they query the accessibility tree
 * and skip hidden nodes.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'yarn build && yarn start',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 5 * 60_000,
      },
});
