import { NextRequest, NextResponse } from 'next/server';
import { refreshAthleteState } from '@/lib/athlete-state/orchestrator';
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
    const result = await refreshAthleteState({
      trainingDayId,
      source,
      forceSync,
    });

    // Compute presentation alongside so the client seeds both caches from one request.
    // Failure is non-blocking — the client falls back to /api/presentation/today.
    //
    // Order is intentional: ensureMorning must run after refresh (snapshot freshness)
    // and complete before buildToday (morning proposal appearance). No other
    // independent presentation work to start in parallel here.
    let todayPresentation = null;
    try {
      const morningRecalibration = await ensureMorningRecalibration(trainingDayId).catch(
        () => null,
      );
      todayPresentation = await buildTodayPresentationViewModel(trainingDayId, {
        morningRecalibration,
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ ...result, todayPresentation });
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
    const freshness = await computeFreshnessSnapshot({ trainingDayId });
    return NextResponse.json(freshness);
  } catch (error) {
    console.error('[api/athlete-state/freshness]', error);
    return NextResponse.json({ error: 'Freshness unavailable' }, { status: 500 });
  }
}
