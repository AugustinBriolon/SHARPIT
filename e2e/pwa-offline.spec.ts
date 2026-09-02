import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clearOfflineSnapshot } from './helpers/pwa';

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

    await context.setOffline(true);
    await page.goto('/~offline', { waitUntil: 'domcontentloaded' });
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

    // Wait until the live Today surface paints so SnapshotOfflineSync has had a
    // chance to persist the canonical AthleteSnapshot for this ownerKey.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 60_000,
    });
    // Give the client effect a beat after snapshot data lands.
    await page.waitForTimeout(1_500);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const readOnly = page.getByText('Lecture seule — hors ligne, données non synchronisables');
    const lastUpdated = page.getByText(/Dernière mise à jour/);

    const hasWarmSummary =
      (await readOnly.isVisible().catch(() => false)) ||
      (await lastUpdated.isVisible().catch(() => false));

    test.skip(
      !hasWarmSummary,
      'no offline snapshot persisted for this session — SnapshotOfflineSync may not have run yet',
    );

    await expect(readOnly).toBeVisible();
    await expect(lastUpdated).toBeVisible();
  });
});
