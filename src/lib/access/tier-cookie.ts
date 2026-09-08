import type { AccessTier } from '@prisma/client';

/**
 * Client + SSR mirror of `AthleteProfile.tier` so Pro gates and `/moi` Pro chrome
 * can render Instantly without a recurrent profile GET on every navigation.
 * Authoritative source remains the DB; this cookie is refreshed when the profile
 * (or admin tier toggle) is loaded.
 */
export const ACCESS_TIER_COOKIE = 'sharpit.access-tier';
export const ACCESS_TIER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAccessTier(value: string | null | undefined): value is AccessTier {
  return value === 'FREE' || value === 'PRO';
}

export function readAccessTierFromCookieString(
  cookieHeader: string | null | undefined,
): AccessTier | null {
  if (!cookieHeader) {
    return null;
  }
  const match = cookieHeader.match(new RegExp(`(?:^|; )${ACCESS_TIER_COOKIE}=([^;]*)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isAccessTier(value) ? value : null;
}

export function readAccessTierFromDocumentCookie(): AccessTier | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return readAccessTierFromCookieString(document.cookie);
}

export function syncAccessTierCookie(tier: AccessTier): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${ACCESS_TIER_COOKIE}=${encodeURIComponent(tier)};path=/;max-age=${ACCESS_TIER_COOKIE_MAX_AGE};SameSite=Lax`;
}

/** `Set-Cookie` value for route handlers (no leading name=). */
export function accessTierSetCookieValue(tier: AccessTier): string {
  return `${ACCESS_TIER_COOKIE}=${encodeURIComponent(tier)}; Path=/; Max-Age=${ACCESS_TIER_COOKIE_MAX_AGE}; SameSite=Lax`;
}
