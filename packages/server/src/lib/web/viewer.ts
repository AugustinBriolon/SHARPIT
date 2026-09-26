import type { AccessTier } from '@prisma/client';
import { hasProAccess } from '@sharpit/server/lib/access/tier';
import { isDemoSession } from '@sharpit/server/lib/demo/demo-session';
import { consentWallHref } from '@sharpit/server/lib/onboarding/entry';
import { athleteNeedsOnboarding } from '@sharpit/server/lib/onboarding/status/status';
import { getAthleteConsentRow } from '@sharpit/server/lib/privacy/consent-store';
import { getAthleteProfile } from '@sharpit/server/lib/queries';

/**
 * What the web's shell needs to route a signed-in visitor (ADR-048 phase 3f): the gates
 * (consent, onboarding, deletion, Pro) and the post-sign-in entry, in one read.
 */
export type WebViewer = {
  isDemo: boolean;
  tier: AccessTier;
  isPro: boolean;
  /** The account was deleted: back to sign-in. */
  deleted: boolean;
  /** The consent wall to pass first, or null. */
  consentWallHref: string | null;
  needsOnboarding: boolean;
  /** The next screen after sign-in: consents, then onboarding, then Today. */
  entryPath: string;
};

export async function loadWebViewer(athleteId: string): Promise<WebViewer> {
  const [isDemo, consentRow, profile, wall, needsOnboarding] = await Promise.all([
    isDemoSession(),
    getAthleteConsentRow(athleteId),
    getAthleteProfile(athleteId),
    consentWallHref(athleteId),
    athleteNeedsOnboarding(athleteId),
  ]);
  const tier = profile?.tier ?? 'FREE';
  return {
    isDemo,
    tier,
    isPro: hasProAccess(tier),
    deleted: Boolean(consentRow?.deletedAt),
    consentWallHref: wall,
    needsOnboarding,
    entryPath: wall ?? (needsOnboarding ? '/onboarding' : '/'),
  };
}
