import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  forceMatchMediaStandalone,
  stubBeforeInstallPrompt,
  stubIosUserAgent,
} from './helpers/pwa';

const STORAGE_STATE = 'e2e/.auth/athlete.json';
const DISMISS_STORAGE_KEY = 'sharpit:install-prompt-dismissed-at';

/**
 * Settings InstallCard — athlete-initiated install entry (ADR-008).
 * Works under `NEXT_PUBLIC_DEV_BYPASS_CLERK` via `yarn test:e2e:dev`.
 * Skips clearly when redirected to `/sign-in`.
 *
 * Dismiss control copy: production uses `aria-label="Ignorer"` on the icon-only X
 * (`src/components/pwa/install-card.tsx`) — assert that, do not invent "Masquer".
 */

test.describe('PWA install card', () => {
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test('iOS UA + not standalone shows Share instructions and dismiss stays hidden after reload', async ({
    page,
  }) => {
    await stubIosUserAgent(page);
    await forceMatchMediaStandalone(page, false);
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, DISMISS_STORAGE_KEY);

    await page.goto('/settings');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`, or record e2e/.auth/athlete.json',
    );

    const title = page.getByText('Installer SHARPIT');
    await expect(title).toBeVisible();
    await expect(page.getByText(/Partager/)).toBeVisible();
    await expect(page.getByText(/écran d['\u2019]accueil/)).toBeVisible();

    await page.getByRole('button', { name: 'Ignorer' }).click();
    await expect(title).toBeHidden();

    await page.reload();
    await expect(page.getByText('Installer SHARPIT')).toBeHidden();
  });

  test('standalone display-mode hides the install card', async ({ page }) => {
    await stubIosUserAgent(page);
    await forceMatchMediaStandalone(page, true);
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, DISMISS_STORAGE_KEY);

    await page.goto('/settings');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`, or record e2e/.auth/athlete.json',
    );

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText('Installer SHARPIT')).toBeHidden();
  });

  test('stubbed beforeinstallprompt shows the Installer button', async ({ page }) => {
    await forceMatchMediaStandalone(page, false);
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, DISMISS_STORAGE_KEY);

    await page.goto('/settings');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`, or record e2e/.auth/athlete.json',
    );

    await stubBeforeInstallPrompt(page);
    await expect(page.getByText('Installer SHARPIT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer' })).toBeVisible();
  });
});
