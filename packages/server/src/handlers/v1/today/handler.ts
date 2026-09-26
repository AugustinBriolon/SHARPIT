import { NextRequest, NextResponse, after } from 'next/server';
import { appOrigin } from '@sharpit/server/lib/app-origin';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { getGarminAccount } from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import { getActivitiesList } from '@sharpit/server/lib/queries';
import {
  analyzeLinkedPlannedSessions,
  autoLinkActivitiesOfDay,
} from '@sharpit/server/lib/planned-session/linking/session-linking';
import { getMorningRecalibrationPresentation } from '@sharpit/server/lib/morning-recalibration/service';
import { buildTodayPresentationViewModel } from '@sharpit/server/lib/presentation/today/today';
import { projectV1Consistency } from '@sharpit/server/lib/presentation/v1/consistency';
import { projectV1TodayFromViewModel } from '@sharpit/server/lib/presentation/v1/today';

function isValidTrainingDayId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Midday local time on the requested day — away from both DST edges. */
function referenceDateFor(trainingDayId: string): Date {
  return new Date(`${trainingDayId}T12:00:00`);
}

/**
 * Pairs the day's finished activities with their planned sessions, as the web does when an
 * activity arrives. The native client never triggers that sync, so without this an athlete
 * who only opens the app would never see a session marked as done. Best effort: a failure
 * costs the pairing, not the screen.
 */
async function autoLinkTodayActivities(athleteId: string, trainingDayId: string): Promise<void> {
  try {
    const sessionIds = await autoLinkActivitiesOfDay(athleteId, referenceDateFor(trainingDayId));
    if (sessionIds.length > 0) {
      after(() => analyzeLinkedPlannedSessions(athleteId, sessionIds));
    }
  } catch (error) {
    console.error('[api/v1/today/auto-link]', error);
  }
}

/**
 * Regularity is read from the athlete's recent activities rather than from the Today
 * view model, which does not carry them. Two ISO weeks is the smallest window that
 * always covers the day strip *and* a full current week, whichever weekday the request
 * lands on. A failure here costs the card, not the screen.
 */
async function loadConsistency(athleteId: string, trainingDayId: string) {
  const activities = await getActivitiesList(athleteId, { sinceDays: 14 }).catch((error) => {
    console.error('[api/v1/today/consistency]', error);
    return null;
  });
  return activities ? projectV1Consistency(activities, referenceDateFor(trainingDayId)) : null;
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
    await autoLinkTodayActivities(athleteId, trainingDayId);
    const morningRecalibration = await getMorningRecalibrationPresentation(
      athleteId,
      trainingDayId,
    ).catch((error) => {
      console.error('[api/v1/today/morning-recalibration]', error);
      return null;
    });

    const [viewModel, garminAccount] = await Promise.all([
      buildTodayPresentationViewModel(athleteId, trainingDayId, { morningRecalibration }),
      getGarminAccount(athleteId),
    ]);
    return NextResponse.json(
      projectV1TodayFromViewModel(viewModel, {
        trainingDayId,
        webOrigin: appOrigin(request.nextUrl.origin),
        garminConnected: Boolean(garminAccount),
        consistency: await loadConsistency(athleteId, trainingDayId),
      }),
    );
  } catch (error) {
    console.error('[api/v1/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
