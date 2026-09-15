import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getMorningRecalibrationPresentation } from '@/lib/morning-recalibration/service';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today/today';
import { projectV1TodayFromViewModel } from '@/lib/presentation/v1/today';

function isValidTrainingDayId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function webOriginFrom(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, '');
  }
  return request.nextUrl.origin;
}

/**
 * Canonical Today payload for native (and future complementary-web) clients.
 * Presentation `/api/presentation/today` remains for the current Next.js UI.
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
      console.error('[api/v1/today/morning-recalibration]', error);
      return null;
    });

    const viewModel = await buildTodayPresentationViewModel(athleteId, trainingDayId, {
      morningRecalibration,
    });
    return NextResponse.json(
      projectV1TodayFromViewModel(viewModel, {
        trainingDayId,
        webOrigin: webOriginFrom(request),
      }),
    );
  } catch (error) {
    console.error('[api/v1/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
