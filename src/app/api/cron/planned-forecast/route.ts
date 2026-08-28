import { NextResponse } from 'next/server';
import { refreshUpcomingPlannedSessionForecasts } from '@/lib/planned-session/forecast/refresh-forecasts';
import { timingSafeEqualString } from '@/lib/crypto/timing-safe-equal';

export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Rafraîchit les contextes environnementaux des séances outdoor (aujourd'hui + demain), chaque matin. */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth || !timingSafeEqualString(auth, `Bearer ${process.env.CRON_SECRET}`)) {
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
