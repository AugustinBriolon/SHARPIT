import type { AccessTier } from '@prisma/client';

/**
 * Single source of truth for what the PRO tier unlocks. Named to stay clear of
 * `displayMode` ('essential' | 'expert', ADR-023) — an unrelated reading-density
 * preference, not a paywall. Billing is not wired yet — `AthleteProfile.tier`
 * is toggled by hand from /admin — but every call site should go through this
 * function so swapping in real billing later only touches where `tier` gets
 * set, not every gate check.
 */
export function hasProAccess(tier: AccessTier): boolean {
  return tier === 'PRO';
}
