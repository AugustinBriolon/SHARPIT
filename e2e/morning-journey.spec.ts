import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const STORAGE_STATE = 'e2e/.auth/athlete.json';

/**
 * Morning contract smoke — cold Today → verdict → optional wellness → verdict still live.
 *
 * Run against `yarn dev` via `yarn test:e2e:dev` (DEV_BYPASS_CLERK). Production
 * `yarn test:e2e` needs `e2e/.auth/athlete.json` or the suite skips at sign-in.
 */

async function completeMorningWellnessIfPresent(page: Page): Promise<boolean> {
  const trigger = page.getByRole('button', { name: /Ressenti du matin/i }).first();
  if (!(await trigger.isVisible().catch(() => false))) {
    return false;
  }

  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const midScores = [/3 — Correct/, /3 — Moyen/, /3 — Modérée/, /3 — Modéré/] as const;

  for (const score of midScores) {
    await page.getByRole('radio', { name: score }).click();
    await page.getByRole('button', { name: /Suivant|Note/ }).click();
  }

  // Notes step — optional; submit empty.
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
  return true;
}

test.describe('morning journey', () => {
  test.use(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {});

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    test.skip(
      new URL(page.url()).pathname.startsWith('/sign-in'),
      'not signed in — run against `yarn dev` via `yarn test:e2e:dev`',
    );
  });

  test('cold Today shows a verdict and survives wellness when available', async ({ page }) => {
    const verdict = page.getByRole('heading', { level: 1 });
    await expect(verdict).toBeVisible({ timeout: 30_000 });
    const before = (await verdict.innerText()).trim();
    expect(before.length).toBeGreaterThan(0);

    const completedWellness = await completeMorningWellnessIfPresent(page);

    await expect(verdict).toBeVisible({ timeout: 30_000 });
    const after = (await verdict.innerText()).trim();
    expect(after.length).toBeGreaterThan(0);

    if (completedWellness) {
      // Refetch may keep or revise the sentence — either is a successful morning loop.
      expect(after).toBeTruthy();
    }
  });
});
