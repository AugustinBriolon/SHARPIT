import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/** Set by `yarn test:e2e:dev`, which points at an already-running `next dev`. */
const againstDevServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

/**
 * Two modes, because the specs need different things from the server.
 *
 * **Production** (`yarn test:e2e`, the default): the webServer below builds and
 * starts the app. Required by anything asserting what a navigation shows
 * *before* the network answers — `next dev` disables prefetching, so without a
 * prefetched shell `instant()` has nothing to freeze.
 *
 * **Dev** (`yarn test:e2e:dev`): runs against a `next dev` you already have up,
 * where DEV_BYPASS_CLERK stands in for a session so the athlete's routes are
 * reachable with no credential. Structural specs live here. The dev server
 * compiles routes on demand and is a single shared resource, so this mode runs
 * serially with a longer expect timeout — in parallel the workers queue behind
 * each other's compiles and time out on navigations that are merely slow.
 *
 * Hidden Activity content stays in the DOM under Cache Components, so prefer
 * `getByRole` / `getByLabel` in these tests — they query the accessibility tree
 * and skip hidden nodes.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: !againstDevServer,
  workers: againstDevServer ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { timeout: againstDevServer ? 15_000 : 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    navigationTimeout: againstDevServer ? 60_000 : 30_000,
    // Optional: e.g. PLAYWRIGHT_STORAGE_STATE=e2e/.auth/athlete.json or a
    // short-lived Vercel share cookie file for protected preview smoke.
    ...(process.env.PLAYWRIGHT_STORAGE_STATE
      ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Pixel 7 layout smoke lives on mobile-chrome only — do not schedule it
      // twice (and then skip) on Desktop Chrome.
      testIgnore: /pwa-mobile-demo\.spec\.ts/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      // Pixel 7 coverage is for the mobile demo layout smoke only — keep the
      // structural / auth specs on Desktop Chrome so config changes do not
      // double-run or alter their existing project matrix.
      testMatch: /pwa-mobile-demo\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'yarn build && yarn start',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 5 * 60_000,
      },
});
