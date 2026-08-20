import { NextRequest, NextResponse, after } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { runActivityNarrativeAnalysis } from '@/lib/activity/narrative/activity-narrative';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/** Generate or refresh the coach narrative for an activity (survives client leave via after). */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isCoachConfigured()) {
      return NextResponse.json(
        { error: 'Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env.' },
        { status: 503 },
      );
    }

    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const force = body?.force !== false;
    const wait = Boolean(body?.wait);

    if (wait) {
      const ok = await runActivityNarrativeAnalysis(id, { force });
      if (!ok) {
        return NextResponse.json({ error: 'Synthèse impossible' }, { status: 500 });
      }
      const activity = await prisma.activity.findUnique({ where: { id } });
      return NextResponse.json(activity);
    }

    after(async () => {
      try {
        await runActivityNarrativeAnalysis(id, { force });
      } catch (error) {
        console.error('[activities/narrative]', id, error);
      }
    });

    return NextResponse.json({ ok: true, status: 'scheduled' });
  } catch (error) {
    console.error('[activities/narrative]', error);
    return NextResponse.json({ error: 'Impossible de lancer la synthèse' }, { status: 500 });
  }
}
