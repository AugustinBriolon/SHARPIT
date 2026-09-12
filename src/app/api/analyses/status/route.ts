import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { pendingAnalysisRuns } from '@/lib/analysis/analysis-run';
import { listRecentAnalysisRuns } from '@/lib/analysis/analysis-run-store';
import { awaitRequest } from '@/lib/next/await-request';

/**
 * What the athlete is waiting on, and what just landed (ADR-036).
 *
 * Read by one client watcher mounted in the app shell, so a finished analysis
 * is announced from any page — never only from the page that started it.
 */
export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const runs = await listRecentAnalysisRuns(athleteId);
    // Counted here so the client never needs a clock during render.
    const pending = pendingAnalysisRuns(runs, new Date()).length;
    return NextResponse.json({ runs, pending });
  } catch (error) {
    console.error('[api/analyses/status]', error);
    return NextResponse.json({ error: 'Statut des analyses indisponible' }, { status: 500 });
  }
}
