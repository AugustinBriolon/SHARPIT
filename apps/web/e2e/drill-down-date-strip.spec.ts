import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Drill-down date strip — pick a day, open the calendar from the selected day,
 * return to today, and load older days by scrolling the strip back.
 *
 * Run against `yarn dev` via `yarn test:e2e:dev` (DEV_BYPASS_CLERK). Production
 * `yarn test:e2e` needs `e2e/.auth/athlete.json` or the suite skips at sign-in.
 */

test.describe('drill-down date strip', () => {
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test.beforeEach(async ({ page }) => {
    await page.goto('/today/sleep');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`',
    );
  });

  test('selects a day, opens the calendar, and returns to today', async ({ page }) => {
    const strip = page.getByRole('group', { name: 'Jours' }).filter({ visible: true });
    await expect(strip).toBeVisible({ timeout: 30_000 });

    const selected = strip.getByRole('button', { pressed: true });
    await expect(selected).toHaveAttribute('aria-current', 'date');

    const previousDay = selected.locator('xpath=preceding-sibling::button[1]');
    await previousDay.click();
    await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);

    await strip.getByRole('button', { pressed: true }).click();
    const calendar = page.getByRole('dialog', { name: 'Sélectionner une date' });
    await expect(calendar).toBeVisible();
    await expect(calendar.getByText('Données disponibles')).toBeVisible();

    await calendar.getByRole('button', { name: /Revenir à aujourd'hui/ }).click();
    await expect(calendar).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]date=/);
  });

  test('loads older days when the strip is scrolled back', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const strip = page.getByRole('group', { name: 'Jours' }).filter({ visible: true });
    await expect(strip).toBeVisible({ timeout: 30_000 });

    const days = strip.locator('[data-day-key]');
    const initialCount = await days.count();
    const initialFirst = await days.first().getAttribute('data-day-key');

    await strip.evaluate((element) => element.scrollTo({ left: 0 }));

    // A demo session is fenced to its seeded week — nothing older to load there.
    const isDemo = await page.getByText(/Mode démo/).isVisible();
    test.skip(isDemo, 'demo sessions cannot scroll past their seeded window');

    await expect.poll(() => days.count()).toBeGreaterThan(initialCount);
    expect(await days.first().getAttribute('data-day-key')).not.toBe(initialFirst);
  });
});
