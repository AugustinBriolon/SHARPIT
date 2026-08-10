import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

/**
 * Regression guard for the Instant Navigations work: these assert what is
 * visible *before* the server answers. They fail when a refactor pulls
 * something back out of a route's prerendered shell — a component that starts
 * reading `cookies()`, a `<Suspense>` boundary that moves, a page that goes
 * back to awaiting data at the top level.
 *
 * Only the auth routes are covered here, because they are the app's only
 * routes reachable without a Clerk session. To extend this to the athlete's
 * routes, sign in once and save the session:
 *
 *   npx playwright codegen --save-storage=e2e/.auth/athlete.json http://localhost:3000
 *
 * then add `storageState: 'e2e/.auth/athlete.json'` to `test.use()` in a new
 * spec. The interesting assertions there are the sidebar and page chrome
 * appearing on the first click into a route, before any data arrives.
 */

test.describe('auth routes navigate instantly', () => {
  test('the shell chrome is on screen before the sign-in widget loads', async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto('/sign-in');
        await expect(page.getByRole('heading', { name: 'SharpIt' })).toBeVisible();
        await expect(page.getByText('Connecte-toi pour accéder')).toBeVisible();
      },
      { baseURL: 'http://localhost:3000' },
    );
  });

  test('moving between sign-in and sign-up keeps the chrome painted', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'SharpIt' })).toBeVisible();

    await instant(page, async () => {
      await page.goto('/sign-up');
      // The subtitle is the part of the shell that differs between the two
      // routes, so seeing it proves the destination's own shell was prefetched
      // rather than the previous page still being on screen.
      await expect(page.getByText('Crée ton compte')).toBeVisible();
    });
  });
});

test('the offline page is fully static', async ({ page }) => {
  await instant(
    page,
    async () => {
      await page.goto('/~offline');
      await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Réessayer' })).toBeVisible();
    },
    { baseURL: 'http://localhost:3000' },
  );
});
