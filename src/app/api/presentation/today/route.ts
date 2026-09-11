import { NextRequest, NextResponse } from 'next/server';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today/today';
import { getMorningRecalibrationPresentation } from '@/lib/morning-recalibration/service';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

function isValidTrainingDayId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Read-only Today presentation. Morning recalibration writes live on
 * POST /api/athlete-state/refresh, wellness check-in, and
 * POST /api/morning-recalibration — not on this GET.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');

  if (!trainingDayId || !isValidTrainingDayId(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId est requis et doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const morningRecalibration = await getMorningRecalibrationPresentation(
      athleteId,
      trainingDayId,
    ).catch((error) => {
      console.error('[api/presentation/today/morning-recalibration]', error);
      return null;
    });

    const viewModel = await buildTodayPresentationViewModel(athleteId, trainingDayId, {
      morningRecalibration,
    });
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
