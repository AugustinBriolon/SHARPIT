import type { AccessTier } from '@prisma/client';

/**
 * Single source of truth for what the PRO tier unlocks. Named to stay clear of
 * `displayMode` ('essential' | 'expert', ADR-023) — an unrelated reading-density
 * preference, not a paywall. `AthleteProfile.tier` is derived from the
 * athlete's subscriptions (Apple, Stripe, the /admin manual toggle) by
 * `recomputeAthleteTier` — ADR-044. Every gate goes through this function.
 */
export function hasProAccess(tier: AccessTier): boolean {
  return tier === 'PRO';
}
