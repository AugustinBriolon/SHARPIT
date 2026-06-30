import { NextRequest, NextResponse } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { analyzeBrick } from '@/lib/coach-analysis';
import { getBrickAnalysis, getBrickSessions, setBrickAnalysis } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json({ error: 'groupId requis' }, { status: 400 });
    }
    const analysis = await getBrickAnalysis(groupId);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[brick/analyze][GET]', error);
    return NextResponse.json({ error: "Impossible de charger l'analyse" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isCoachConfigured()) {
      return NextResponse.json(
        { error: 'Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env.' },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const groupId = typeof body?.brickGroupId === 'string' ? body.brickGroupId : null;
    if (!groupId) {
      return NextResponse.json({ error: 'brickGroupId requis' }, { status: 400 });
    }

    const legs = await getBrickSessions(groupId);
    if (legs.length < 2) {
      return NextResponse.json({ error: 'Brick introuvable ou incomplet' }, { status: 404 });
    }
    if (legs.some((l) => !l.activity)) {
      return NextResponse.json(
        {
          error:
            "Lie d'abord chaque sport du brick à son activité réalisée avant d'analyser l'enchaînement.",
        },
        { status: 400 },
      );
    }

    const analysis = await analyzeBrick(groupId);
    if (!analysis) {
      return NextResponse.json({ error: 'Analyse impossible' }, { status: 500 });
    }

    const saved = await setBrickAnalysis(groupId, analysis);
    return NextResponse.json({ analysis: saved });
  } catch (error) {
    console.error('[brick/analyze][POST]', error);
    return NextResponse.json({ error: "L'analyse du brick a échoué" }, { status: 500 });
  }
}
