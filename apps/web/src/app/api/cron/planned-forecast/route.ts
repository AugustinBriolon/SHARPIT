import { NextResponse } from 'next/server';
import { refreshUpcomingPlannedSessionForecasts } from '@/lib/planned-session/forecast/refresh-forecasts';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';

export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Rafraîchit les contextes environnementaux des séances outdoor (aujourd'hui + demain), chaque matin. */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  try {
    const result = await refreshUpcomingPlannedSessionForecasts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/planned-forecast]', error);
    return NextResponse.json({ error: 'Forecast refresh failed' }, { status: 500 });
  }
}
