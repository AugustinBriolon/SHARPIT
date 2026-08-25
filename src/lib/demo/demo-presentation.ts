import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { FreshnessLevel } from '@/core/athlete-state/freshness';
import { DEMO_CLERK_USER_ID } from '@/lib/demo/demo-session';

export { DEMO_CLERK_USER_ID };

export function isDemoAthleteProfile(profile: { clerkUserId: string } | null | undefined): boolean {
  return profile?.clerkUserId === DEMO_CLERK_USER_ID;
}

const DEMO_NIGHT_BLOCKING: ReadonlySet<FreshnessLevel> = new Set([
  'awaiting_data',
  'syncing',
  'computing',
  'stale',
]);

/**
 * Demo athletes always ship with seeded night proofs — never trap Today in
 * EVIDENCE_PENDING because the visitor is exploring at an odd hour.
 */
export function withDemoSnapshotFreshness(snapshot: AthleteSnapshot): AthleteSnapshot {
  const domains = snapshot.freshness.domains.map((entry) => {
    if (entry.domain !== 'sleep' && entry.domain !== 'recovery') return entry;
    if (!DEMO_NIGHT_BLOCKING.has(entry.freshness)) return entry;
    return {
      ...entry,
      freshness: 'fresh' as const,
      state: 'fresh',
      productMessage: null,
    };
  });

  const domainMessages = { ...snapshot.domainMessages };
  if (domainMessages.sleep?.includes('sommeil')) delete domainMessages.sleep;
  if (domainMessages.recovery?.includes('récupération')) delete domainMessages.recovery;

  const overallFresh =
    domains.every((d) => d.freshness === 'fresh' || d.freshness === 'stale') &&
    !snapshot.freshness.providers.some((p) => p.syncing);

  return {
    ...snapshot,
    domainMessages,
    freshness: {
      ...snapshot.freshness,
      domains,
      overallFresh,
      primaryProductMessage: null,
    },
  };
}
