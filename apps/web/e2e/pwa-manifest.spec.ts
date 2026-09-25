import { expect, test, type APIResponse } from '@playwright/test';

/**
 * Manifest + install-surface asset contract from `docs/PWA_TESTING.md`.
 * No auth required — public routes and static/generated assets only.
 *
 * Hard assertions belong on local `yarn test:e2e` (config webServer). Against a
 * Vercel Authentication / SSO preview, `request.get` may receive an HTML login
 * shell with status 200 — that is not a product regression; skip explicitly.
 */

function contentType(response: APIResponse): string {
  return (response.headers()['content-type'] ?? '').toLowerCase();
}

function looksLikeAuthShell(response: APIResponse): boolean {
  const status = response.status();
  if (status === 401 || status === 403) {
    return true;
  }
  const ct = contentType(response);
  return ct.includes('text/html');
}

test.describe('PWA manifest and install assets', () => {
  test('manifest.webmanifest exposes the standalone install contract', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    test.skip(
      looksLikeAuthShell(response),
      'preview behind Vercel Authentication — run yarn test:e2e locally for hard asserts',
    );
    expect(response.status()).toBe(200);

    const manifest = (await response.json()) as {
      display?: string;
      start_url?: string;
      lang?: string;
      name?: string;
      short_name?: string;
      icons?: Array<{ src: string; sizes: string; purpose?: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.lang).toBe('fr');
    expect(manifest.name).toBe('SHARPIT');
    expect(manifest.short_name).toBe('SHARPIT');

    const icons = manifest.icons ?? [];
    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', purpose: 'any' }),
        expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({
          src: '/icons/icon-512-maskable.png',
          sizes: '512x512',
          purpose: 'maskable',
        }),
      ]),
    );
  });

  test('icon, favicon and apple-splash assets respond 200 with image content-type', async ({
    request,
  }) => {
    const probe = await request.get('/icons/icon-192.png');
    test.skip(
      looksLikeAuthShell(probe),
      'preview behind Vercel Authentication — asset checks need local yarn test:e2e',
    );

    for (const { path, type } of [
      { path: '/icons/icon-192.png', type: /^image\/png\b/ },
      { path: '/icons/icon-512.png', type: /^image\/png\b/ },
      { path: '/icons/icon-512-maskable.png', type: /^image\/png\b/ },
      { path: '/favicon.svg', type: /^image\/svg\+xml\b/ },
      { path: '/favicon-dark.svg', type: /^image\/svg\+xml\b/ },
      { path: '/apple-splash/iphone-notch', type: /^image\/png\b/ },
      { path: '/apple-splash/iphone-se', type: /^image\/png\b/ },
      { path: '/apple-splash/ipad-portrait', type: /^image\/png\b/ },
      { path: '/apple-splash/ipad-landscape', type: /^image\/png\b/ },
    ] as const) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(contentType(response), path).toMatch(type);
    }
  });

  test('sign-in head wires manifest, theme-color and iOS splash links', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    // Protected previews redirect to vercel.com/login. Prefer URL (stable) over a
    // racey heading probe — do not soft-skip merely because splash links are missing
    // (that would hide real product regressions on local yarn test:e2e).
    const onVercelAuth =
      /vercel\.com\/(?:login|sso)/i.test(page.url()) ||
      page.url().includes('sso-api') ||
      (await page.getByRole('heading', { name: 'Log in to Vercel' }).count()) > 0;
    test.skip(
      onVercelAuth,
      'preview behind Vercel Authentication — run yarn test:e2e locally for hard asserts',
    );

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      /manifest\.webmanifest/,
    );

    const themeColors = page.locator('meta[name="theme-color"]');
    await expect(themeColors).toHaveCount(2);

    const splashLinks = page.locator('link[rel="apple-touch-startup-image"]');
    await expect(splashLinks).toHaveCount(4);
    for (const href of [
      '/apple-splash/iphone-notch',
      '/apple-splash/iphone-se',
      '/apple-splash/ipad-portrait',
      '/apple-splash/ipad-landscape',
    ]) {
      await expect(
        page.locator(`link[rel="apple-touch-startup-image"][href="${href}"]`),
      ).toHaveCount(1);
    }

    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
  });
});
