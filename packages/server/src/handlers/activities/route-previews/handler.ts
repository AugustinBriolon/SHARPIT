import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { getActivityRoutePreviews } from '@sharpit/server/lib/streams/route-previews';

/**
 * Batch GPS previews for the Activité hub — cache-only, no provider fetch.
 * One call replaces N× GET /api/activities/:id/streams on the history list.
 */
export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const previews = await getActivityRoutePreviews(athleteId);
    return NextResponse.json(previews);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les aperçus de parcours' },
      { status: 500 },
    );
  }
}
