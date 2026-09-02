import { NextRequest, NextResponse } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { analyzePlannedSession } from '@/lib/coach/plan/coach-analysis';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';
import { getPlannedSessionById, setPlannedSessionAnalysis } from '@/lib/queries';

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isCoachConfigured()) {
      return NextResponse.json(
        { error: 'Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env.' },
        { status: 503 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const existing = await getPlannedSessionById(athleteId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance planifiée introuvable' }, { status: 404 });
    }
    if (!existing.activity) {
      return NextResponse.json({ error: 'Aucune activité liée à analyser' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(rateLimiters.sessionAnalyze, athleteId, { failClosed: true });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }

    const analysis = await analyzePlannedSession(athleteId, id);
    if (!analysis) {
      return NextResponse.json({ error: 'Analyse impossible' }, { status: 500 });
    }

    const session = await setPlannedSessionAnalysis(athleteId, id, analysis);
    return NextResponse.json(session);
  } catch (error) {
    console.error('[planned-sessions/analyze]', error);
    return NextResponse.json({ error: "L'analyse a échoué" }, { status: 500 });
  }
}
