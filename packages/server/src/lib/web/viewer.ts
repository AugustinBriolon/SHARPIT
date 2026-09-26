import type { WebViewer } from '@sharpit/app/lib/web/payloads';
import { hasProAccess } from '@sharpit/app/lib/access/tier';
import { isDemoSession } from '@sharpit/app/lib/demo/demo-session';
import { consentWallHref } from '@sharpit/server/lib/onboarding/entry';
import { athleteNeedsOnboarding } from '@sharpit/server/lib/onboarding/status/status';
import { getAthleteConsentRow } from '@sharpit/server/lib/privacy/consent-store';
import { getAthleteProfile } from '@sharpit/server/lib/queries';

export type { WebViewer };

/**
 * What the web's shell needs to route a signed-in visitor (ADR-048 phase 3f): the gates
 * (consent, onboarding, deletion, Pro) and the post-sign-in entry, in one read.
 */
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
