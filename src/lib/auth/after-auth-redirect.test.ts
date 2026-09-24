import { describe, expect, it } from 'vitest';
import { afterAuthPath } from '@/lib/auth/after-auth-redirect';

const origin = 'https://sharpit.app';

describe('afterAuthPath', () => {
  it('goes to Today without a redirect_url', () => {
    expect(afterAuthPath(null, origin)).toBe('/');
  });

  it('returns into the Garmin handoff Clerk was carrying', () => {
    expect(afterAuthPath('https://sharpit.app/connect/garmin', origin)).toBe('/connect/garmin');
    expect(afterAuthPath('/connect/garmin/start', origin)).toBe('/connect/garmin/start');
  });

  it('never sends a signed-in athlete to a signed-out page', () => {
    expect(afterAuthPath('https://sharpit.app/welcome', origin)).toBe('/');
    expect(afterAuthPath('/sign-in', origin)).toBe('/');
    expect(afterAuthPath('/sign-up/verify', origin)).toBe('/');
  });

  it('never opens another origin', () => {
    expect(afterAuthPath('https://evil.example/connect/garmin', origin)).toBe('/');
    expect(afterAuthPath('//evil.example/x', origin)).toBe('/');
    expect(afterAuthPath('https://sharpit.vercel.app/', origin)).toBe('/');
  });

  it('keeps the query of a same-origin target', () => {
    expect(afterAuthPath('/plan?week=2', origin)).toBe('/plan?week=2');
  });
});
