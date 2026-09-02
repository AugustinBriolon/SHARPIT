import { expect, test } from '@playwright/test';

/**
 * Mirrors `useServiceWorkerUpdate` waiting detection (`src/hooks/use-sw-update.ts`):
 * `getRegistration()` → if `registration.waiting` → AVAILABLE; `applyUpdate` posts
 * `{ type: 'SKIP_WAITING' }` (ADR-008 / `src/sw.ts`).
 *
 * No real deploy flake — stubs `navigator.serviceWorker` with an already-waiting worker.
 * Deliberately does NOT fire `controllerchange` so the applying UI stays visible.
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
        update: async () => {},
        unregister: async () => true,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: { state: 'activated' },
          getRegistration: async () => registration,
          getRegistrations: async () => [registration],
          register: async () => registration,
          addEventListener() {},
          removeEventListener() {},
          ready: Promise.resolve(registration),
        },
      });
    });

    // Root layout mounts UpdateAvailableToast on every route — prefer a public
    // static page so DEV_BYPASS (which redirects /sign-in → /) cannot interfere.
    await page.goto('/~offline');
    await expect(page.getByRole('heading', { name: 'Hors connexion' })).toBeVisible();

    await expect(page.getByText('Nouvelle version disponible')).toBeVisible();
    const updateButton = page.getByRole('button', { name: 'Mettre à jour' });
    await expect(updateButton).toBeEnabled();
    await updateButton.click();

    // Immediate feedback — never a dead click while waiting for controllerchange.
    await expect(page.getByText('Mise à jour en cours…')).toBeVisible();
    await expect(page.getByText('Rechargement dans un instant')).toBeVisible();

    const messages = await page.evaluate(
      () => (window as unknown as { __swPostMessages?: unknown[] }).__swPostMessages ?? [],
    );
    expect(messages).toContainEqual({ type: 'SKIP_WAITING' });

    // Double-tap must not post SKIP_WAITING again (button gone / toast is loading).
    await page.getByText('Mise à jour en cours…').click({ force: true }).catch(() => undefined);
    const messagesAfter = await page.evaluate(
      () => (window as unknown as { __swPostMessages?: unknown[] }).__swPostMessages ?? [],
    );
    expect(messagesAfter.filter((m) => (m as { type?: string }).type === 'SKIP_WAITING')).toHaveLength(
      1,
    );
  });
});
