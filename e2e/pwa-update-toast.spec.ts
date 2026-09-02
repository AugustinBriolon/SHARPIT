import { expect, test } from '@playwright/test';

/**
 * Mirrors `useServiceWorkerUpdate` waiting detection (`src/hooks/use-sw-update.ts`):
 * `getRegistration()` → if `registration.waiting` → AVAILABLE; `applyUpdate` posts
 * `{ type: 'SKIP_WAITING' }` (ADR-008 / `src/sw.ts`).
 *
 * No real deploy flake — stubs `navigator.serviceWorker` with an already-waiting worker.
 */

test.describe('PWA update toast', () => {
  test('shows Nouvelle version disponible and posts SKIP_WAITING on Mettre à jour', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const postMessages: unknown[] = [];
      (window as unknown as { __swPostMessages?: unknown[] }).__swPostMessages = postMessages;

      const waitingWorker = {
        state: 'installed',
        postMessage(message: unknown) {
          postMessages.push(message);
        },
        addEventListener() {},
        removeEventListener() {},
      };

      const registration = {
        waiting: waitingWorker,
        installing: null,
        active: { state: 'activated' },
        addEventListener() {},
        removeEventListener() {},
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { state: 'activated' },
          getRegistration: async () => registration,
          addEventListener() {},
          removeEventListener() {},
        },
      });
    });

    // Root layout mounts UpdateAvailableToast on every route — prefer a public
    // static page so DEV_BYPASS (which redirects /sign-in → /) cannot interfere.
    await page.goto('/~offline');
    await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();

    await expect(page.getByText('Nouvelle version disponible')).toBeVisible();
    await page.getByRole('button', { name: 'Mettre à jour' }).click();

    const messages = await page.evaluate(
      () => (window as unknown as { __swPostMessages?: unknown[] }).__swPostMessages ?? [],
    );
    expect(messages).toContainEqual({ type: 'SKIP_WAITING' });
  });
});
