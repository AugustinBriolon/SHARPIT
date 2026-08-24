import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  refreshAthleteState,
  shouldSkipTodayPresentationRebuild,
} from '@/lib/athlete-state/orchestrator';
import { computeFreshnessSnapshot, trainingDayIdNow } from '@/lib/athlete-state/freshness-service';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today';
import { ensureMorningRecalibration } from '@/lib/morning-recalibration/service';

export const maxDuration = 120;

/**
 * Athlete-centric refresh — triggered on app open.
 * Syncs required providers, runs fast inference, schedules background work.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? trainingDayIdNow();
  const forceSync = searchParams.get('forceSync') === 'true';

  let source: 'app_shell' | 'today_refresh' = 'app_shell';
  try {
    const body = await request.json();
    if (body?.source === 'today_refresh') source = 'today_refresh';
  } catch {
    // empty body ok
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const result = await refreshAthleteState(athleteId, {
      trainingDayId,
      source,
      forceSync,
    });

    // Compute presentation alongside so the client seeds both caches from one request.
    // Soft open + unchanged snapshot → skip heavy rebuild (client keeps RQ cache).
    let todayPresentation = null;
    let presentationSkipped = false;

    try {
      const morning = await ensureMorningRecalibration(athleteId, trainingDayId, {
        athleteSnapshot: result.athleteSnapshot,
      }).catch(() => ({ presentation: null, created: false }));

      const skip = shouldSkipTodayPresentationRebuild({
        source,
        forceSync,
        syncedProviderCount: result.syncedProviders.length,
        snapshotChanged: result.snapshotChanged,
        morningRecalibrationCreated: morning.created,
      });

      if (skip) {
        presentationSkipped = true;
      } else {
        todayPresentation = await buildTodayPresentationViewModel(athleteId, trainingDayId, {
          morningRecalibration: morning.presentation,
          athleteSnapshot: result.athleteSnapshot,
        });
      }
    } catch {
      // non-blocking
    }

    return NextResponse.json({ ...result, todayPresentation, presentationSkipped });
  } catch (error) {
    console.error('[api/athlete-state/refresh]', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour ton état. Réessaie.' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? trainingDayIdNow();

  try {
    const athleteId = await getCurrentAthleteId();
    const freshness = await computeFreshnessSnapshot({ athleteId, trainingDayId });
    return NextResponse.json(freshness);
  } catch (error) {
    console.error('[api/athlete-state/freshness]', error);
    return NextResponse.json({ error: 'Freshness unavailable' }, { status: 500 });
  }
}
