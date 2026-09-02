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
 * Shell V1: bottom tabs are Today · Plan · Activité · Moi. Coach is contextual.
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
    await page.goto('/plan');
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
    await expect(current).toHaveAttribute('href', '/plan');

    await page.locator('nav[aria-label="Navigation principale"] a[href="/moi"]').first().click();
    await expect(page).toHaveURL(/\/moi$/);

    const afterNav = page.locator('[aria-current="page"]:visible');
    await expect(afterNav).toHaveCount(1);
    await expect(afterNav).toHaveAttribute('href', '/moi');
  });

  test('bottom tabs are Shell V1 destinations without Coach', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.locator('a[href="/"]')).toBeVisible();
    await expect(nav.locator('a[href="/plan"]')).toBeVisible();
    await expect(nav.locator('a[href="/activite"]')).toBeVisible();
    await expect(nav.locator('a[href="/moi"]')).toBeVisible();
    await expect(nav.locator('a[href="/coach"]')).toHaveCount(0);
    await expect(nav.getByText('Aujourd’hui', { exact: true })).toBeVisible();
    await expect(nav.getByText('Plan', { exact: true })).toBeVisible();
    await expect(nav.getByText('Activité', { exact: true })).toBeVisible();
    await expect(nav.getByText('Moi', { exact: true })).toBeVisible();
    await expect(nav.getByText('Démo', { exact: true })).toHaveCount(0);
    // Demo chrome: CircleUser glyph, not a « D » initials pastille (banner signals demo).
    await expect(nav.locator('a[href="/moi"]')).not.toContainText(/^D$/);
  });

  test('a drill-down paints exactly one header', async ({ page }) => {
    // The server page renders this header as its Suspense fallback and the
    // client screen renders the same one. Two would mean the extraction drifted.
    await page.goto('/today/sleep');

    const headings = page.getByRole('heading', { level: 1 });
    await expect(headings).toHaveCount(1);
    await expect(headings).toHaveText('Sommeil');
  });

  test('the Moi hub lists destinations and secondary entries before status arrives', async ({
    page,
  }) => {
    // Destinations are static shell; secondary Compte chip streams status.
    await page.goto('/moi');

    await expect(page.locator('a[href="/moi/corps"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/moi/objectifs"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/settings/privacy"]:visible').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Destinations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accès' })).toHaveCount(0);

    for (const href of ['/settings/account', '/settings/equipment']) {
      await expect(page.locator(`a[href="${href}"]:visible`).first()).toBeVisible();
    }

    // Quiet réglages — demoted, still reachable.
    await expect(page.getByRole('link', { name: 'À propos' })).toBeVisible();
  });

  test('Moi child pages back to Moi (dedicated Corps / Objectifs / Confidentialité)', async ({
    page,
  }) => {
    await page.goto('/moi');
    await page.locator('a[href="/moi/corps"]:visible').first().click();
    await expect(page).toHaveURL(/\/moi\/corps$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Corps');
    await expect(page.getByRole('link', { name: 'Moi' }).first()).toBeVisible();

    await page.goto('/moi');
    await page.locator('a[href="/moi/objectifs"]:visible').first().click();
    await expect(page).toHaveURL(/\/moi\/objectifs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Objectifs');
    await expect(page.getByRole('link', { name: 'Moi' }).first()).toBeVisible();

    await page.goto('/settings/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Confidentialité');
    await expect(page.getByRole('link', { name: 'Moi' }).first()).toBeVisible();
  });

  test('the back link resolves its label from the nav stack', async ({ page }) => {
    // MobileBackLink renders a static href+label directly, but with no href it
    // reads the app's nav stack behind a boundary. Reaching the detail from the
    // Activité hub list is what makes the dynamic branch resolve to "Activité".
    await page.goto('/activite');
    await page.locator('a[href^="/training/cm"]:visible').first().click();
    await expect(page).toHaveURL(/\/training\/cm/);

    await expect(page.getByRole('link', { name: 'Activité' })).toBeVisible();
  });

  test('Plan hub shows widgets without Accès dump', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Organiser/);
    await expect(page.getByRole('heading', { name: 'Objectif' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prochaines séances' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Charge / récup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accès' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Fil de la semaine' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Séjours' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Planification' })).toBeVisible();
  });

  test('Activité hub shows history + Nouvelle activité without Accès or Séjours', async ({
    page,
  }) => {
    await page.goto('/activite');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Ce que tu as fait/);
    await expect(page.getByRole('link', { name: /Nouvelle activité/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accès' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Séjours' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Historique' })).toHaveCount(0);
  });
});
