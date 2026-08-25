import { NextResponse } from 'next/server';
import { GoogleOAuthError } from '@/lib/integrations/google/google';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncFromGoogle } from '@/lib/integrations/google/google-sync';
import { checkRateLimit, rateLimitResponseBody, rateLimiters } from '@/lib/rate-limit';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:google`);
    if (!rateLimit.ok) {
      return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), {
        status: 429,
      });
    }
    const result = await syncFromGoogle(athleteId);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof GoogleOAuthError) {
      return NextResponse.json(
        { error: error.message, needsReconnect: error.needsReconnect },
        { status: error.needsReconnect ? 401 : 500 },
      );
    }
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
