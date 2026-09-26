import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

/** Old URLs stay deep links, as config redirects rather than page files. */
describe('legacy redirects', () => {
  it.each([
    ['/settings/privacy', '/settings/account#confidentialite'],
    ['/settings/feedback', '/moi'],
    ['/settings/appearance/expert-mode', '/settings/personalization#densite'],
    ['/integrations/connected', '/settings/integrations'],
  ])('%s → %s', async (source, destination) => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({ source, destination, permanent: true });
  });
});
