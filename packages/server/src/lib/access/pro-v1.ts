import type { AccessTier } from '@prisma/client';
import { ALL_PRO_PERKS } from '@sharpit/server/lib/access/pro-perks';

export type V1ProSubscription = {
  status: 'active' | 'grace_period' | 'billing_retry' | 'expired' | 'revoked';
  source: 'apple' | 'stripe' | 'manual';
  renewsAt: string | null;
  expiresAt: string | null;
  willRenew: boolean;
};

export type V1Pro = {
  apiVersion: 1;
  tier: AccessTier;
  perks: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pro' | 'included' | 'planned';
  }>;
  subscription: V1ProSubscription | null;
};

/**
 * SharpIt Pro for the native app: the athlete's tier, the perks as the web lists them
 * (`pro-perks.ts` — the app never duplicates the copy) and the subscription behind the
 * tier, when there is one.
 */
export function projectV1Pro(tier: AccessTier, subscription: V1ProSubscription | null): V1Pro {
  return {
    apiVersion: 1,
    tier,
    perks: ALL_PRO_PERKS.map(({ id, title, description, status }) => ({
      id,
      title,
      description,
      status,
    })),
    subscription,
  };
}
