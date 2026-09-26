import { NextResponse } from 'next/server';
import { projectV1Pro } from '@sharpit/server/lib/access/pro-v1';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import { loadProState } from '@sharpit/server/lib/billing/subscription-store';

/** The athlete's SharpIt Pro page: tier, perks, subscription (ADR-040). */
export async function GET() {
  // Outside try: the Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const { tier, subscription } = await loadProState(athleteId);
    return NextResponse.json(projectV1Pro(tier, subscription));
  } catch (error) {
    console.error('[api/v1/pro]', error);
    return NextResponse.json({ error: 'Impossible de charger SharpIt Pro' }, { status: 500 });
  }
}
