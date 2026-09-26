import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  wall: null as string | null,
  onboarding: false,
  tier: 'FREE',
  deletedAt: null as Date | null,
}));

vi.mock('@sharpit/app/lib/demo/demo-session', () => ({ isDemoSession: async () => false }));
vi.mock('@sharpit/server/lib/onboarding/entry', () => ({
  consentWallHref: async () => state.wall,
}));
vi.mock('@sharpit/server/lib/onboarding/status/status', () => ({
  athleteNeedsOnboarding: async () => state.onboarding,
}));
vi.mock('@sharpit/server/lib/privacy/consent-store', () => ({
  getAthleteConsentRow: async () => ({ deletedAt: state.deletedAt }),
}));
vi.mock('@sharpit/server/lib/queries', () => ({
  getAthleteProfile: async () => ({ tier: state.tier }),
}));

describe('loadWebViewer', () => {
  beforeEach(() => {
    Object.assign(state, { wall: null, onboarding: false, tier: 'FREE', deletedAt: null });
  });

  it('sends a settled athlete to Today', async () => {
    const { loadWebViewer } = await import('./viewer');
    await expect(loadWebViewer('ath-1')).resolves.toEqual({
      isDemo: false,
      tier: 'FREE',
      isPro: false,
      deleted: false,
      consentWallHref: null,
      needsOnboarding: false,
      entryPath: '/',
    });
  });

  it('puts the consent wall before onboarding', async () => {
    Object.assign(state, { wall: '/consent', onboarding: true });
    const { loadWebViewer } = await import('./viewer');
    expect((await loadWebViewer('ath-1')).entryPath).toBe('/consent');
  });

  it('sends a new athlete to onboarding, and knows Pro and deleted accounts', async () => {
    Object.assign(state, { onboarding: true, tier: 'PRO', deletedAt: new Date() });
    const { loadWebViewer } = await import('./viewer');
    expect(await loadWebViewer('ath-1')).toMatchObject({
      entryPath: '/onboarding',
      isPro: true,
      deleted: true,
    });
  });
});
