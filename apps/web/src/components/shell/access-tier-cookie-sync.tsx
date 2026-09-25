'use client';

import { useEffect } from 'react';
import type { AccessTier } from '@prisma/client';
import { useAthleteProfile } from '@/hooks/use-data';
import { syncAccessTierCookie } from '@/lib/access/tier-cookie';

/**
 * Keeps the access-tier cookie aligned with the cached athlete profile so
 * `/moi` and Pro-gated chrome can render Instantly without a fresh GET.
 */
export function AccessTierCookieSync({ tier }: { tier?: AccessTier }) {
  const profile = useAthleteProfile();
  const resolved = tier ?? profile.data?.tier;

  useEffect(() => {
    if (!resolved) {
      return;
    }
    syncAccessTierCookie(resolved);
  }, [resolved]);

  return null;
}
