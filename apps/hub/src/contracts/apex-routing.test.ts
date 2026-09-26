import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

/** The apex serves its own paths and hands every other one to the web, path kept (ADR-051). */
async function webRedirect() {
  const [redirect] = (await nextConfig.redirects?.()) ?? [];
  const pattern = /^\/:path\((.+)\)$/.exec(redirect.source)?.[1] ?? '';
  return { redirect, matches: (path: string) => new RegExp(`^/${pattern}$`).test(path) };
}

describe('apex routing', () => {
  it('keeps the iOS contract on the apex', async () => {
    const { matches } = await webRedirect();
    for (const path of [
      '/.well-known/apple-app-site-association',
      '/connect/garmin',
      '/connect/garmin/start',
      '/connect/garmin/callback',
      '/privacy',
      '/terms',
      '/sign-in',
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  it('sends everything else to the web, path kept, not permanently', async () => {
    const { redirect, matches } = await webRedirect();
    for (const path of ['/welcome', '/demo', '/sign-up', '/activite/abc', '/settings']) {
      expect(matches(path), path).toBe(true);
    }
    expect(redirect.destination).toBe('https://web.sharpit.app/:path');
    expect(redirect.permanent).toBe(false);
  });

  it('sends the apex root to the web too', async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({
      source: '/',
      destination: 'https://web.sharpit.app/',
      permanent: false,
    });
  });
});
