import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  needsConsent: false,
  needsOnboarding: false,
  profile: null as null | Record<string, unknown>,
}));

vi.mock('@sharpit/server/lib/privacy/consent-store', () => ({
  athleteNeedsLegalConsent: async () => state.needsConsent,
  getAthleteConsentRow: async () => state.profile,
}));
vi.mock('@sharpit/server/lib/onboarding/status/status', () => ({
  athleteNeedsOnboarding: async () => state.needsOnboarding,
}));

describe('athleteEntryPath', () => {
  beforeEach(() => {
    state.needsConsent = false;
    state.needsOnboarding = false;
    state.profile = null;
  });

  it('sends a brand-new account to the consent wall first', async () => {
    state.needsConsent = true;
    state.needsOnboarding = true;
    const { athleteEntryPath } = await import('./entry');
    await expect(athleteEntryPath('athlete-1')).resolves.toBe('/consent');
  });

  it('sends a consented athlete who has not onboarded to onboarding', async () => {
    state.needsOnboarding = true;
    const { athleteEntryPath } = await import('./entry');
    await expect(athleteEntryPath('athlete-1')).resolves.toBe('/onboarding');
  });

  it('sends an existing, onboarded athlete to Today', async () => {
    const { athleteEntryPath } = await import('./entry');
    await expect(athleteEntryPath('athlete-1')).resolves.toBe('/');
  });

  it('asks back for a withdrawn health consent with its own wall', async () => {
    state.needsConsent = true;
    state.profile = {
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      privacyVersion: (await import('@sharpit/server/lib/privacy/constants'))
        .CURRENT_PRIVACY_VERSION,
      healthDataConsentAt: null,
    };
    const { athleteEntryPath } = await import('./entry');
    await expect(athleteEntryPath('athlete-1')).resolves.toMatch(/^\/consent\?reason=/);
  });
});
