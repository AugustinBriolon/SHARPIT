import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { projectV1HealthOverview } from '@sharpit/server/lib/health/health-v1';
import { loadHealthOverviewInputs } from '@sharpit/server/lib/health/health-v1-data';

/**
 * Santé for the native app (ADR-040): the vital signs, body composition and daily context, each
 * read against a published norm and the athlete's own month, with what deserves attention now.
 * Free: only the biological age inside it is SharpIt Pro (ADR-045).
 */
export async function GET() {
  // Outside try: the Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    return NextResponse.json(projectV1HealthOverview(await loadHealthOverviewInputs(athleteId)));
  } catch (error) {
    console.error('[api/v1/health/overview]', error);
    return NextResponse.json({ error: 'Impossible de charger ta santé' }, { status: 500 });
  }
}
