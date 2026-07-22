import { NextRequest, NextResponse } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { analyzePlannedSession } from '@/lib/coach/coach-analysis';
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

    const existing = await getPlannedSessionById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance planifiée introuvable' }, { status: 404 });
    }
    if (!existing.activity) {
      return NextResponse.json({ error: 'Aucune activité liée à analyser' }, { status: 400 });
    }

    const analysis = await analyzePlannedSession(id);
    if (!analysis) {
      return NextResponse.json({ error: 'Analyse impossible' }, { status: 500 });
    }

    const session = await setPlannedSessionAnalysis(id, analysis);
    return NextResponse.json(session);
  } catch (error) {
    console.error('[planned-sessions/analyze]', error);
    return NextResponse.json({ error: "L'analyse a échoué" }, { status: 500 });
  }
}
