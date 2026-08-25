import { describe, expect, it } from 'vitest';
import { needsOnboardingFromProfile } from '@/lib/onboarding/needs-onboarding';

describe('needsOnboardingFromProfile', () => {
  it('requires onboarding when the flag is null', () => {
    expect(
      needsOnboardingFromProfile({
        onboardingCompletedAt: null,
        isDemo: false,
        isDevBypass: false,
      }),
    ).toBe(true);
  });

  it('skips when completed', () => {
    expect(
      needsOnboardingFromProfile({
        onboardingCompletedAt: new Date(),
        isDemo: false,
        isDevBypass: false,
      }),
    ).toBe(false);
  });

  it('skips demo and dev bypass even when flag is null', () => {
    expect(
      needsOnboardingFromProfile({
        onboardingCompletedAt: null,
        isDemo: true,
        isDevBypass: false,
      }),
    ).toBe(false);
    expect(
      needsOnboardingFromProfile({
        onboardingCompletedAt: null,
        isDemo: false,
        isDevBypass: true,
      }),
    ).toBe(false);
  });
});
