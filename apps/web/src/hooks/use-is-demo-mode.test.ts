import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBrowserDemoAccount, resolveIsDemoMode } from './use-is-demo-mode';

describe('resolveIsDemoMode', () => {
  it('is false until the user has loaded', () => {
    expect(resolveIsDemoMode('sharpit-demo', false)).toBe(false);
  });

  it('is true for the shared demo account', () => {
    expect(resolveIsDemoMode('sharpit-demo', true)).toBe(true);
  });

  it('is false for a real athlete or a stranger', () => {
    expect(resolveIsDemoMode(null, true)).toBe(false);
    expect(resolveIsDemoMode(undefined, true)).toBe(false);
    expect(resolveIsDemoMode('someone-else', true)).toBe(false);
  });
});

describe('isBrowserDemoAccount', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the signed-in Clerk user', () => {
    vi.stubGlobal('Clerk', { user: { externalId: 'sharpit-demo' } });
    expect(isBrowserDemoAccount()).toBe(true);
    vi.stubGlobal('Clerk', { user: { externalId: null } });
    expect(isBrowserDemoAccount()).toBe(false);
  });

  it('is false before Clerk loads', () => {
    expect(isBrowserDemoAccount()).toBe(false);
  });
});
