import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers/pwa';

/**
 * Mobile viewport smoke for the public demo entry (`docs/PWA_TESTING.md` small-screen
 * class). Chromium Pixel 7 only — no WebKit/Safari project.
 */

test.describe('PWA mobile demo entry', () => {
  // Scheduled only on `mobile-chrome` via playwright.config `testMatch`.

  test('/sign-in shows SharpIt and the demo CTA without horizontal overflow', async ({ page }) => {
    await page.goto('/sign-in');
    test.skip(
      !new URL(page.url()).pathname.startsWith('/sign-in'),
      'DEV_BYPASS_CLERK redirects /sign-in → / — run under yarn test:e2e (production) or without bypass',
    );
    await expect(page.getByRole('heading', { name: 'SharpIt' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Essayer la démo' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('/demo does not render a Next 404 and does not overflow horizontally', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('This page could not be found')).toHaveCount(0);
    await expect(page.getByText('404')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
