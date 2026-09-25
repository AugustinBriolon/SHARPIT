import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncWithingsHealth } from '@/lib/integrations/withings/withings-sync';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:withings`, {
      failClosed: true,
    });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }
    const body = await request.json().catch(() => ({}));
    const full = Boolean((body as { full?: boolean }).full);

    const result = await syncWithingsHealth(athleteId, full ? { full: true } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchronisation Withings échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
