import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  BODY_METRIC_KEYS,
  isBodyMetricKey,
  isBodySeriesRange,
  projectV1BodySeries,
} from '@/lib/body/body-v1';
import { loadBodySeriesInputs } from '@/lib/body/body-v1-data';

/** One Corps metric over 30 d / 90 d / 1 an / Tout, oldest first (metric drawer). */
export async function GET(request: NextRequest) {
  const metric = request.nextUrl.searchParams.get('metric');
  const range = request.nextUrl.searchParams.get('range') ?? '90d';

  if (!isBodyMetricKey(metric)) {
    return NextResponse.json(
      { error: `metric est requis parmi : ${BODY_METRIC_KEYS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!isBodySeriesRange(range)) {
    return NextResponse.json({ error: 'range doit valoir 30d, 90d, 1y ou all' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const inputs = await loadBodySeriesInputs(athleteId, range);
    return NextResponse.json(projectV1BodySeries(metric, range, inputs));
  } catch (error) {
    console.error('[api/v1/body/series]', error);
    return NextResponse.json({ error: 'Impossible de charger la série' }, { status: 500 });
  }
}
