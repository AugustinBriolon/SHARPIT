import { describe, expect, it } from 'vitest';
import { TEASER_FORBIDDEN_COPY } from '@sharpit/app/lib/teaser/screens';
import { LANDING_LINKS, landingCopyStrings } from '@sharpit/app/lib/landing/landing-copy';

describe('landing copy', () => {
  it('makes no health processing claim (same wall as the teaser)', () => {
    const text = landingCopyStrings().join('\n').toLowerCase();
    for (const forbidden of TEASER_FORBIDDEN_COPY) {
      expect(text, forbidden).not.toContain(forbidden.toLowerCase());
    }
  });

  it('uses no em dash', () => {
    for (const line of landingCopyStrings()) {
      expect(line, line).not.toContain('—');
    }
  });

  it('sends account actions to the web app and keeps legal pages on the apex', () => {
    expect(LANDING_LINKS.signUp).toBe('https://web.sharpit.app/sign-up');
    expect(LANDING_LINKS.demo).toBe('https://web.sharpit.app/demo');
    expect(LANDING_LINKS.privacy).toBe('/privacy');
  });
});
