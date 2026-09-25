import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:myfitnesspal`, {
      failClosed: true,
    });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }
    const result = await syncMfpNutrition(athleteId);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
