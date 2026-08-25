import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncRenphoHealth } from '@/lib/integrations/renpho/renpho-sync';
import { checkRateLimit, rateLimitResponseBody, rateLimiters } from '@/lib/rate-limit';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:renpho`);
    if (!rateLimit.ok) {
      return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), {
        status: 429,
      });
    }
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
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
