import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AppleOwnershipError,
  applyAppleTransaction,
  athleteForAppleTransaction,
  statusFromAppleNotification,
} from '@sharpit/server/lib/billing/apple-sync';
import {
  verifyAppleNotification,
  verifyAppleRenewalInfo,
  verifyAppleTransaction,
} from '@sharpit/server/lib/billing/apple-verifier';
import { logSafeError } from '@sharpit/server/lib/privacy/safe-log';

const bodySchema = z.object({ signedPayload: z.string().min(1).max(100_000) });

/**
 * App Store Server Notifications V2 (renewals, expiry, billing retry / grace period,
 * refund, revoke). Public — Apple calls it with no session — so nothing is trusted
 * before the payload's signature is verified against Apple's roots. Any 200 is an ack;
 * Apple retries non-200 answers, so only a bad signature or body is refused.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'signedPayload manquant' }, { status: 400 });
  }

  let notification;
  try {
    notification = await verifyAppleNotification(parsed.data.signedPayload);
  } catch (error) {
    logSafeError('billing/apple/notifications verify', error);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  const { data } = notification;
  if (!data?.signedTransactionInfo) {
    // TEST notifications and summaries carry no transaction.
    return NextResponse.json({ ok: true, handled: false });
  }

  try {
    const handled = await applyNotification(notification.notificationType, data);
    return NextResponse.json({ ok: true, handled });
  } catch (error) {
    if (error instanceof AppleOwnershipError) {
      logSafeError('billing/apple/notifications ownership', error);
      return NextResponse.json({ ok: true, handled: false });
    }
    logSafeError('billing/apple/notifications', error);
    return NextResponse.json({ error: 'Traitement impossible' }, { status: 500 });
  }
}

/** Verifies the transaction a notification carries and applies it to its owner, if any. */
async function applyNotification(
  notificationType: string | undefined,
  data: { signedTransactionInfo?: string; signedRenewalInfo?: string; status?: unknown },
): Promise<boolean> {
  const transaction = await verifyAppleTransaction(data.signedTransactionInfo!);
  const renewal = data.signedRenewalInfo
    ? await verifyAppleRenewalInfo(data.signedRenewalInfo)
    : null;
  const owner = await athleteForAppleTransaction(transaction);
  if (!owner) {
    console.info('[billing/apple/notifications]', { type: notificationType, handled: false });
    return false;
  }
  await applyAppleTransaction({
    athleteId: owner.athleteId,
    athleteAppAccountToken: owner.appAccountToken,
    transaction,
    renewal,
    statusOverride: statusFromAppleNotification(
      notificationType,
      typeof data.status === 'number' ? data.status : undefined,
    ),
  });
  return true;
}
