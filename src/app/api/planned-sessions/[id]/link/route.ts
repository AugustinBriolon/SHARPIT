import { NextRequest, NextResponse } from 'next/server';
import { getPlannedSessionById, linkPlannedSessionActivity } from '@/lib/queries';

type RouteContext = { params: Promise<{ id: string }> };

// La liaison est désormais découplée de l'analyse IA : elle répond
// immédiatement, et le client déclenche l'analyse (route /analyze) juste après.
// Cela évite un spinner long et tout risque de timeout LLM au moment du link.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const activityId: string | null = body?.activityId ?? null;

    const existing = await getPlannedSessionById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance planifiée introuvable' }, { status: 404 });
    }

    const session = await linkPlannedSessionActivity(id, activityId);
    return NextResponse.json(session);
  } catch (error) {
    console.error('[planned-sessions/link]', error);
    return NextResponse.json({ error: 'Impossible de lier la séance' }, { status: 500 });
  }
}
