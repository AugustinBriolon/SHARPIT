import { describe, expect, it } from 'vitest';
import {
  ACCESS_TIER_COOKIE,
  accessTierSetCookieValue,
  isAccessTier,
  readAccessTierFromCookieString,
} from '@/lib/access/tier-cookie';

describe('tier-cookie', () => {
  it('accepts only FREE and PRO', () => {
    expect(isAccessTier('FREE')).toBe(true);
    expect(isAccessTier('PRO')).toBe(true);
    expect(isAccessTier('ENTERPRISE')).toBe(false);
    expect(isAccessTier(null)).toBe(false);
  });

  it('reads the access-tier cookie from a header string', () => {
    expect(readAccessTierFromCookieString(`${ACCESS_TIER_COOKIE}=PRO; path=/`)).toBe('PRO');
    expect(readAccessTierFromCookieString(`a=1; ${ACCESS_TIER_COOKIE}=FREE; b=2`)).toBe('FREE');
    expect(readAccessTierFromCookieString('other=1')).toBeNull();
    expect(readAccessTierFromCookieString(null)).toBeNull();
  });

  it('builds a Set-Cookie value for route handlers', () => {
    expect(accessTierSetCookieValue('PRO')).toContain(`${ACCESS_TIER_COOKIE}=PRO`);
    expect(accessTierSetCookieValue('PRO')).toContain('SameSite=Lax');
  });
});
