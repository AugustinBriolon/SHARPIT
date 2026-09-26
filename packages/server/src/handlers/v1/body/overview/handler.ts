import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { projectV1BodyOverview } from '@sharpit/server/lib/body/body-v1';
import { loadBodyOverviewInputs } from '@sharpit/server/lib/body/body-v1-data';

/**
 * Every Corps metric in one read for the native app (ADR-040): composition, recovery
 * references and thresholds. A metric without data is absent; `biologicalAge` stays null
 * until its method ADR lands.
 */
export async function GET() {
  // Outside try: the Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    return NextResponse.json(projectV1BodyOverview(await loadBodyOverviewInputs(athleteId)));
  } catch (error) {
    console.error('[api/v1/body/overview]', error);
    return NextResponse.json({ error: 'Impossible de charger les données Corps' }, { status: 500 });
  }
}
