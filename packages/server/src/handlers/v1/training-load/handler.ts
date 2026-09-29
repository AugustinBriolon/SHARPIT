import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  loadAthletePmcPoints,
  loadDailyTrainingStressEntries,
} from '@sharpit/server/lib/training/pmc/pmc-server';
import { projectV1TrainingLoad } from '@sharpit/server/lib/presentation/v1/training-load';

/**
 * Fitness, fatigue and form for native clients (ADR-040) — the expert reading's load layer.
 * The web's Effort page reads the same PMC through `/api/presentation/effort`.
 */
export async function GET(request: NextRequest) {
  const trainingDayId = new URL(request.url).searchParams.get('trainingDayId');

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId est requis et doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
    const [pmcPoints, dailyStress] = await Promise.all([
      loadAthletePmcPoints(athleteId, { refDate }),
      loadDailyTrainingStressEntries(athleteId, { refDate }),
    ]);
    return NextResponse.json(projectV1TrainingLoad(trainingDayId, pmcPoints, dailyStress));
  } catch (error) {
    console.error('[api/v1/training-load]', error);
    return NextResponse.json({ error: 'Impossible de lire la charge' }, { status: 500 });
  }
}
