import { NextRequest, NextResponse } from 'next/server';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';

export const dynamic = 'force-dynamic';

/**
 * Aggregated Today API — returns the canonical Athlete Snapshot.
 *
 * GET /api/today?trainingDayId=<YYYY-MM-DD>&athleteId=<id>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');
  const athleteId = searchParams.get('athleteId') ?? 'default';

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId is required and must be in YYYY-MM-DD format.' },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);

    if (
      !snapshot.reasoning &&
      !snapshot.recovery &&
      !snapshot.fatigue &&
      !snapshot.adaptation &&
      !snapshot.dailyStrain
    ) {
      return NextResponse.json(
        { error: 'Today state computation failed. Please try again.' },
        { status: 500 },
      );
    }

    // Backward-compatible shape for legacy consumers
    return NextResponse.json({
      snapshot,
      reasoning: snapshot.reasoning,
      recovery: snapshot.recovery,
      fatigue: snapshot.fatigue,
      adaptation: snapshot.adaptation,
      dailyStrain: snapshot.dailyStrain,
      athleteId,
    });
  } catch (error) {
    console.error('[api/today]', error);
    return NextResponse.json(
      { error: 'Today state computation failed. Please try again.' },
      { status: 500 },
    );
  }
}
