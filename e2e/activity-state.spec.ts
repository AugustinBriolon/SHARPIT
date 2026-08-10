import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Cache Components hides a route with React `<Activity>` instead of unmounting
 * it ([ADR-010]), so click-triggered state survives a navigation unless a
 * component clears it. `useResetWhenHidden` is what clears it; these specs are
 * the guard that it keeps happening.
 *
 * Every surface here is behind the Clerk allow-list, so the app has to be
 * reachable while signed in. Unlike the instant-navigation specs these assert
 * nothing about prefetching, so they do not need a production build — run them
 * against the dev server, where DEV_BYPASS_CLERK already stands in for a
 * session and no credential is involved:
 *
 *   yarn dev                 # in one terminal
 *   yarn test:e2e:dev        # in another
 *
 * `yarn test:e2e` builds and starts production instead, where the bypass is off
 * by design. There they run only if `e2e/.auth/athlete.json` holds a live
 * session, and skip with a reason otherwise — a signed-out run would otherwise
 * read as broken features rather than a missing session.
 *
 * Hidden Activity content stays in the DOM, so assert on *visibility*
 * (`getByRole` / `toBeVisible`), never on presence alone. The same is true of
 * duplicate ids: a route left hidden keeps its inputs, so `#heightCm` can match
 * twice.
 *
 * [ADR-010]: docs/adr/ADR-010-cache-components-and-instant-navigation.md
 */

test.describe('transient UI state resets when a route is hidden', () => {
  // Applied only when recorded — passing a missing path fails the fixture.
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test.beforeEach(async ({ page }) => {
    await page.goto('/training/history');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      "not signed in — run against `yarn dev` via `yarn test:e2e:dev`, or record a session (see this file's comment)",
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

    // Leaving happens through browser back, not a nav link: the dialog is modal,
    // so while it is open the rest of the page is out of the accessibility tree
    // and no link is clickable. Back is the route the athlete actually takes.
    await page.goBack();
    await expect(page).toHaveURL(/\/training\/history$/);

    await page.goForward();
    await expect(page).toHaveURL(/\/settings\/memory$/);
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
