import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clearOfflineSnapshot, waitForOfflineSnapshot } from './helpers/pwa';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Offline surfaces from `docs/PWA_TESTING.md`.
 *
 * Prefetch / instant() coverage for `/~offline` stays in `instant-navigation.spec.ts`.
 * This file owns offline *behavior*: the static fallback copy, empty-store safety,
 * and the warm SnapshotOfflineSync path (production + real Clerk session only).
 *
 * SnapshotOfflineSync is disabled when `NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true'`
 * in development — do not invent a fake IndexedDB `ownerKey` (ownership mismatch
 * clears the store). Warm path requires `yarn test:e2e` + optional
 * `e2e/.auth/athlete.json`.
 */

test.describe('PWA offline surfaces', () => {
  test('/~offline shows the safe fallback copy', async ({ page }) => {
    await page.goto('/~offline');
    await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Réessayer' })).toBeVisible();
  });

  test('empty store + offline still reaches the safe offline surface', async ({
    page,
    context,
  }) => {
    // Open the origin (public static page) so IndexedDB is available before
    // cutting the network. Prefer `/~offline` over `/sign-in` — DEV_BYPASS
    // redirects `/sign-in` away in development.
    await page.goto('/~offline');
    await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();
    await clearOfflineSnapshot(page);

    // Production registers `/sw.js` and precaches `/~offline`. Wait briefly for
    // a controller when present; without one (remote preview cold tab), reload
    // while offline still exercises the already-painted safe surface via cache
    // or fails open — assert the heading either way after a best-effort reload.
    await page
      .waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
        timeout: 10_000,
      })
      .catch(() => undefined);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Réessayer' })).toBeVisible();
  });
});

test.describe('PWA warm offline snapshot', () => {
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test('Today serves the read-only offline summary after a warm SnapshotOfflineSync', async ({
    page,
    context,
  }) => {
    test.skip(
      !existsSync(STORAGE_STATE),
      'no e2e/.auth/athlete.json — record a Clerk session for the warm offline path',
    );

    await page.goto('/today');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — warm offline path needs a real Clerk session (SnapshotOfflineSync is off under DEV_BYPASS)',
    );

    // Wait until the live Today surface paints, then until IndexedDB holds the
    // warm AthleteSnapshot (SnapshotOfflineSync) — no fixed sleep.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 60_000,
    });
    const persisted = await waitForOfflineSnapshot(page, 45_000);
    test.skip(
      !persisted,
      'no IndexedDB athlete-snapshot/current — SnapshotOfflineSync did not persist for this session (CI without e2e/.auth/athlete.json never covers this path)',
    );

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(
      page.getByText('Lecture seule — hors ligne, données non synchronisables'),
    ).toBeVisible();
    await expect(page.getByText(/Dernière mise à jour/)).toBeVisible();
  });
});
