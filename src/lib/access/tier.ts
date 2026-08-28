import type { AccessTier } from '@prisma/client';

/**
 * Single source of truth for what an EXPERT tier unlocks. Billing is not wired
 * yet — `AthleteProfile.tier` is toggled by hand from /admin — but every call
 * site should go through this function so swapping in real billing later
 * only touches where `tier` gets set, not every gate check.
 */
export function hasExpertAccess(tier: AccessTier): boolean {
  return tier === 'EXPERT';
}
