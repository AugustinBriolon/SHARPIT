import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { appAccountTokenFor } from '@/lib/billing/subscription-store';

/**
 * The UUID the app passes to StoreKit as `appAccountToken` on every purchase, so the
 * App Store's notifications name this account. Stable: the same on every call.
 */
export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    return NextResponse.json({
      apiVersion: 1,
      appAccountToken: await appAccountTokenFor(athleteId),
    });
  } catch (error) {
    console.error('[api/v1/billing/apple/app-account-token]', error);
    return NextResponse.json({ error: 'Jeton de compte indisponible' }, { status: 500 });
  }
}
