import 'server-only';

import { randomUUID } from 'node:crypto';
import type { AccessTier, Subscription, SubscriptionStatus } from '@prisma/client';
import type { V1ProSubscription } from '@/lib/access/pro-v1';
import { subscriptionGrantsPro } from '@/lib/billing/subscription-status';
import { prisma } from '@sharpit/db/client';

/**
 * `AthleteProfile.tier` is derived, never set by hand: Pro while any entitlement grants
 * it (ADR-044). Every write to a subscription ends here.
 */
export async function recomputeAthleteTier(
  athleteId: string,
  now = new Date(),
): Promise<AccessTier> {
  const subscriptions = await prisma.subscription.findMany({
    where: { athleteId },
    select: { status: true, expiresAt: true },
  });
  const tier: AccessTier = subscriptions.some((s) =>
    subscriptionGrantsPro(s.status, s.expiresAt, now),
  )
    ? 'PRO'
    : 'FREE';
  await prisma.athleteProfile.updateMany({
    where: { id: athleteId, NOT: { tier } },
    data: { tier },
  });
  return tier;
}

/** The /admin toggle: a manual entitlement, on or off, then the derived tier. */
export async function setManualTier(athleteId: string, tier: AccessTier) {
  const status: SubscriptionStatus = tier === 'PRO' ? 'active' : 'expired';
  await prisma.subscription.upsert({
    where: { id: `manual_${athleteId}` },
    create: {
      id: `manual_${athleteId}`,
      athleteId,
      source: 'manual',
      productId: 'manual',
      status,
    },
    update: { status },
  });
  const derived = await recomputeAthleteTier(athleteId);
  return { id: athleteId, tier: derived };
}

/**
 * The UUID StoreKit attaches to every purchase (`appAccountToken`), stable per athlete,
 * so Apple's notifications can be tied back to the account. Issued once, on demand.
 */
export async function appAccountTokenFor(athleteId: string): Promise<string> {
  await prisma.athleteProfile.updateMany({
    where: { id: athleteId, appAccountToken: null },
    data: { appAccountToken: randomUUID() },
  });
  const profile = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: athleteId },
    select: { appAccountToken: true },
  });
  return profile.appAccountToken!;
}

export async function athleteIdForAppAccountToken(token: string): Promise<string | null> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { appAccountToken: token },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export type AppleSubscriptionWrite = {
  athleteId: string;
  originalTransactionId: string;
  productId: string;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  willRenew: boolean;
  environment: string | null;
  appAccountToken: string | null;
};

/** One row per `originalTransactionId` — the same across every renewal. */
export async function upsertAppleSubscription(write: AppleSubscriptionWrite) {
  const { athleteId, originalTransactionId, ...fields } = write;
  await prisma.subscription.upsert({
    where: { originalTransactionId },
    create: { athleteId, originalTransactionId, source: 'apple', ...fields },
    update: fields,
  });
  return recomputeAthleteTier(athleteId);
}

export async function findAppleSubscription(originalTransactionId: string) {
  return prisma.subscription.findUnique({ where: { originalTransactionId } });
}

const STATUS_ORDER: SubscriptionStatus[] = [
  'active',
  'grace_period',
  'billing_retry',
  'expired',
  'revoked',
];

/**
 * The subscription to show: the one granting access, else the most recent. A manual
 * entitlement switched off is an admin detail, not something the athlete ever bought.
 */
export function pickDisplayedSubscription(rows: Subscription[]): Subscription | null {
  return (
    rows
      .filter((row) => row.source !== 'manual' || row.status === 'active')
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          b.updatedAt.getTime() - a.updatedAt.getTime(),
      )[0] ?? null
  );
}

export function toV1ProSubscription(row: Subscription): V1ProSubscription {
  const expiresAt = row.expiresAt?.toISOString() ?? null;
  return {
    status: row.status,
    source: row.source,
    renewsAt: row.willRenew ? expiresAt : null,
    expiresAt,
    willRenew: row.willRenew,
  };
}

export async function loadProState(athleteId: string) {
  const [profile, rows] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { id: athleteId }, select: { tier: true } }),
    prisma.subscription.findMany({ where: { athleteId } }),
  ]);
  const displayed = pickDisplayedSubscription(rows);
  return {
    tier: profile?.tier ?? ('FREE' as const),
    subscription: displayed ? toV1ProSubscription(displayed) : null,
  };
}
