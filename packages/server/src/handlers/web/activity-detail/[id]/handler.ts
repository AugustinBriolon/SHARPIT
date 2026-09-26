import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { loadActivityDetail } from '@sharpit/server/lib/web/activity-detail';

type RouteContext = { params: Promise<{ id: string }> };

/** The web activity page's reads (`ActivityDetailPayload`). */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const detail = await loadActivityDetail(await getCurrentAthleteId(), id);
    if (!detail) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error('[api/web/activity-detail]', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.json({ error: 'Impossible de charger la séance' }, { status: 500 });
  }
}
