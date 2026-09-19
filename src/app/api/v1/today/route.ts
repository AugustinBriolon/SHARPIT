import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getActivitiesList } from '@/lib/queries';
import { getMorningRecalibrationPresentation } from '@/lib/morning-recalibration/service';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today/today';
import { projectV1Consistency } from '@/lib/presentation/v1/consistency';
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

/** Midday local time on the requested day — away from both DST edges. */
function referenceDateFor(trainingDayId: string): Date {
  return new Date(`${trainingDayId}T12:00:00`);
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

    // Regularity is read from the athlete's recent activities rather than from the
    // Today view model, which does not carry them. Two ISO weeks is the smallest window
    // that always covers the day strip *and* a full current week, whichever weekday the
    // request lands on. A failure here costs the card, not the screen.
    const consistencyActivities = await getActivitiesList(athleteId, { sinceDays: 14 }).catch(
      (error) => {
        console.error('[api/v1/today/consistency]', error);
        return null;
      },
    );

    const viewModel = await buildTodayPresentationViewModel(athleteId, trainingDayId, {
      morningRecalibration,
    });
    return NextResponse.json(
      projectV1TodayFromViewModel(viewModel, {
        trainingDayId,
        webOrigin: webOriginFrom(request),
        consistency: consistencyActivities
          ? projectV1Consistency(consistencyActivities, referenceDateFor(trainingDayId))
          : null,
      }),
    );
  } catch (error) {
    console.error('[api/v1/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
