import { NextRequest, NextResponse, after } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { enrichActivityObservedContext } from '@/lib/activity/detail/enrich-observed-context';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { analyzePlannedSession } from '@/lib/coach/plan/coach-analysis';
import { prisma } from '@/lib/prisma';
import {
  getPlannedSessionById,
  linkPlannedSessionActivity,
  setPlannedSessionAnalysis,
} from '@/lib/queries';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Link responds immediately. Compliance analysis runs in `after()` so it survives
 * the client leaving the page — no dependency on a live browser tab.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const body = await request.json().catch(() => ({}));
    const activityId: string | null = body?.activityId ?? null;

    const existing = await getPlannedSessionById(athleteId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance planifiée introuvable' }, { status: 404 });
    }

    const session = await linkPlannedSessionActivity(athleteId, id, activityId);
    if (activityId) {
      after(async () => {
        try {
          await enrichActivityObservedContext(prisma, athleteId, activityId);
        } catch (error) {
          console.error('[planned-sessions/link/enrich]', error);
        }
        if (!isCoachConfigured()) return;
        try {
          const analysis = await analyzePlannedSession(athleteId, id);
          if (analysis) await setPlannedSessionAnalysis(athleteId, id, analysis);
        } catch (error) {
          console.error('[planned-sessions/link/analyze]', error);
        }
      });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error('[planned-sessions/link]', error);
    return NextResponse.json({ error: 'Impossible de lier la séance' }, { status: 500 });
  }
}
