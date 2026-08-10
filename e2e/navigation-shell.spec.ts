import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Structural guards for the Cache Components restructure ([ADR-010]).
 *
 * Every route was reshaped so its chrome prerenders while the view streams:
 * the nav highlight, the back link label and the drill-down headers each moved
 * behind — or deliberately outside — a `<Suspense>` boundary. These specs assert
 * the *result* of that split. They fail when a boundary moves back over
 * something that belongs in the shell, or when an extracted header stops
 * matching the one its fallback paints.
 *
 * Deliberately not asserted here: what is on screen *before* the server answers.
 * That needs a prefetched shell, so it lives in `instant-navigation.spec.ts`
 * against a production build. These run against `yarn dev` via
 * `yarn test:e2e:dev`, where DEV_BYPASS_CLERK stands in for a session.
 *
 * Hidden Activity content stays in the DOM, so assert on visibility
 * (`getByRole`), never presence. Note that `getByRole` also handles
 * `position: fixed` chrome correctly, which a naive `offsetParent` check does
 * not.
 *
 * [ADR-010]: docs/adr/ADR-010-cache-components-and-instant-navigation.md
 */

test.describe('navigation shell', () => {
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test.beforeEach(async ({ page }) => {
    await page.goto('/training');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`',
    );
  });

  test('the active nav item resolves after the shell', async ({ page }) => {
    // The nav prerenders unhighlighted and the highlight streams in, so exactly
    // one item must end up current — not zero (boundary never resolved) and not
    // several (a hidden route's nav still claiming the page).
    const current = page.locator('[aria-current="page"]:visible');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute('href', '/training');

    await page.getByRole('link', { name: 'Réglages' }).first().click();
    await expect(page).toHaveURL(/\/settings$/);

    const afterNav = page.locator('[aria-current="page"]:visible');
    await expect(afterNav).toHaveCount(1);
    await expect(afterNav).toHaveAttribute('href', '/settings');
  });

  test('a drill-down paints exactly one header', async ({ page }) => {
    // The server page renders this header as its Suspense fallback and the
    // client screen renders the same one. Two would mean the extraction drifted.
    await page.goto('/today/sleep');

    const headings = page.getByRole('heading', { level: 1 });
    await expect(headings).toHaveCount(1);
    await expect(headings).toHaveText('Sommeil');
  });

  test('the settings hub lists every entry before its status arrives', async ({ page }) => {
    // The list is static and belongs in the shell; each status chip is its own
    // streamed boundary. All seven rows must be there, and each must resolve to
    // real text rather than being stuck on its skeleton.
    await page.goto('/settings');

    for (const href of [
      '/settings/account',
      '/settings/equipment',
      '/settings/goals',
      '/settings/memory',
      '/settings/integrations',
      '/settings/appearance',
      '/settings/about',
    ]) {
      await expect(page.locator(`a[href="${href}"]:visible`).first()).toBeVisible();
    }

    // The version is the About row's chip, so seeing it means the chips
    // streamed in rather than staying on their skeletons. Scoped to the row by
    // role: a bare text match also hits the hidden leftovers Activity keeps in
    // the DOM, which is the trap this file's header warns about.
    await expect(page.getByRole('link', { name: /À propos/ })).toContainText(/v\d+\.\d+\.\d+/);
  });

  test('the back link resolves its label from the nav stack', async ({ page }) => {
    // MobileBackLink renders a static href+label directly, but with no href it
    // reads the app's nav stack behind a boundary. Reaching the detail from the
    // history list is what makes the dynamic branch resolve to "Historique".
    await page.goto('/training/history');
    await page.locator('a[href^="/training/cm"]:visible').first().click();
    await expect(page).toHaveURL(/\/training\/cm/);

    await expect(page.getByRole('link', { name: 'Historique' })).toBeVisible();
  });
});
