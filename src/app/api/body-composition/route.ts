import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getBodyCompositionMeasurements } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const rawDays = request.nextUrl.searchParams.get('days');
  const parsedDays = rawDays !== null ? Number(rawDays) : undefined;
  const days =
    parsedDays !== null && Number.isFinite(parsedDays) && parsedDays > 0
      ? Math.min(parsedDays, 365 * 20)
      : undefined;
  const athleteId = await getCurrentAthleteId();
  const entries = await getBodyCompositionMeasurements(athleteId, days);
  return NextResponse.json(entries);
}
