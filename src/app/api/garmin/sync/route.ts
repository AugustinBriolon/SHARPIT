import { NextRequest, NextResponse } from 'next/server';
import { syncGarminActivities } from '@/lib/garmin-activity-sync';
import { syncGarminHealth } from '@/lib/garmin-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// L'import complet peut être long (pagination + évaluation par activité).
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let days = 30;
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
      if (body?.days) days = Math.min(Number(body.days), 365);
    } catch {
      // pas de body, on garde 30 jours
    }

    // Pour l'historique complet, on couvre aussi toute la santé disponible (1 an).
    const health = await syncGarminHealth(full ? 365 : days);
    const activities = await syncGarminActivities(full ? { full: true } : { sinceDays: days });
    return NextResponse.json({ ...health, activities });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
