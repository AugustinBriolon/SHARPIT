import { expect, test } from '@playwright/test';

/**
 * Manifest + install-surface asset contract from `docs/PWA_TESTING.md`.
 * No auth required — public routes and static/generated assets only.
 */

test.describe('PWA manifest and install assets', () => {
  test('manifest.webmanifest exposes the standalone install contract', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
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

  test('icon, favicon and apple-splash assets respond 200', async ({ request }) => {
    for (const path of [
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/icon-512-maskable.png',
      '/favicon.svg',
      '/favicon-dark.svg',
      '/apple-splash/iphone-notch',
      '/apple-splash/iphone-se',
      '/apple-splash/ipad-portrait',
      '/apple-splash/ipad-landscape',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
  });

  test('sign-in head wires manifest, theme-color and iOS splash links', async ({ page }) => {
    await page.goto('/sign-in');

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
