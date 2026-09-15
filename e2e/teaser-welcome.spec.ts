import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

/**
 * Public teaser funnel — reachable signed-out (Clerk public route).
 * No athlete data, no app shell / demo badges on the first paint.
 */

test.describe('public teaser funnel', () => {
  test('welcome paints the first promise screen without auth', async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto('/welcome');
        await expect(page.getByText('SHARPIT').first()).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Un coach pour tenir la distance' }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute(
          'href',
          '/privacy',
        );
        await expect(page.getByRole('link', { name: 'Conditions' })).toHaveAttribute(
          'href',
          '/terms',
        );
      },
      { baseURL: 'http://localhost:3000' },
    );
  });

  test('funnel reaches sign-up CTA and secondary sign-in link', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Un jumeau numérique qui évolue avec toi' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Décider le matin, avancer le reste du jour' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    await expect(page.getByRole('link', { name: /J.ai déjà un compte/ })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });
});
