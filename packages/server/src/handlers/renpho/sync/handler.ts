import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { syncRenphoHealth } from '@sharpit/server/lib/integrations/renpho/renpho-sync';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:renpho`, {
      failClosed: true,
    });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) {
        full = true;
      }
    } catch {
      // pas de body → sync incrémentale depuis dernière sync
    }

    const result = await syncRenphoHealth(athleteId, full ? { full: true } : {});
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation Renpho échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
