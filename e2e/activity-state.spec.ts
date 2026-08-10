import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Cache Components hides a route with React `<Activity>` instead of unmounting
 * it ([ADR-010]), so click-triggered state survives a navigation unless a
 * component clears it. `useResetWhenHidden` is what clears it; these specs are
 * the guard that it keeps happening.
 *
 * They need a signed-in session, since every surface here is behind the Clerk
 * allow-list. Create or refresh one with:
 *
 *   npx playwright codegen --save-storage=e2e/.auth/athlete.json http://localhost:3000
 *
 * With no session file the suite skips. With an expired one it skips too, and
 * says so — a stale session would otherwise read as three broken features.
 *
 * Hidden Activity content stays in the DOM, so assert on *visibility*
 * (`getByRole` / `toBeVisible`), never on presence alone. The same is true of
 * duplicate ids: a route left hidden keeps its inputs, so `#heightCm` can match
 * twice.
 *
 * [ADR-010]: docs/adr/ADR-010-cache-components-and-instant-navigation.md
 */

// Resolved once, before the storageState fixture is built — a per-test
// `test.skip()` would still try to load the missing file first.
const describeWithSession = existsSync(STORAGE_STATE) ? test.describe : test.describe.skip;

describeWithSession('transient UI state resets when a route is hidden', () => {
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/training/history');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      `the session in ${STORAGE_STATE} has expired — re-record it (see this file's comment)`,
    );
  });

  test('the history filter panel is closed on the way back', async ({ page }) => {
    const filters = page.getByRole('button', { name: /Filtres/ });
    await filters.click();
    await expect(filters).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('link', { name: 'Réglages' }).first().click();
    await expect(page).toHaveURL(/\/settings$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/training\/history$/);
    await expect(page.getByRole('button', { name: /Filtres/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('the coach memory entry form is closed on the way back', async ({ page }) => {
    await page.goto('/settings/memory');

    await page
      .getByRole('button', { name: /Ajouter/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('link', { name: 'Accueil' }).first().click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/settings\/memory$/);
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
