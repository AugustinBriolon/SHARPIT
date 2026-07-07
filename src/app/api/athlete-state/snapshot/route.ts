import { NextRequest, NextResponse } from 'next/server';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { trainingDayIdNow } from '@/lib/athlete-state/freshness-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/athlete-state/snapshot?trainingDayId=YYYY-MM-DD
 *
 * Returns the latest persisted Athlete Snapshot immediately.
 * Consumers (Today, notifications, widgets) must use this — never recompute inference.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? trainingDayIdNow();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId must be in YYYY-MM-DD format.' },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);
    return NextResponse.json({ snapshot, isRefreshing: false });
  } catch (error) {
    console.error('[api/athlete-state/snapshot]', error);
    return NextResponse.json(
      { error: 'Impossible de charger ton état. Réessaie.' },
      { status: 500 },
    );
  }
}
