import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isApnsConfigured } from '@/lib/push/apns';
import { sendMorningPushForAthlete } from '@/lib/push/morning-push';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.apiGeneral, `push-test:${athleteId}`);
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    if (!isApnsConfigured()) {
      return NextResponse.json(
        {
          apiVersion: 1,
          ok: false,
          error: 'APNs non configuré sur ce serveur (clés APNS_* manquantes)',
        },
        { status: 503 },
      );
    }

    const { origin } = new URL(request.url);
    const result = await sendMorningPushForAthlete(athleteId, {
      force: true,
      origin,
    });

    return NextResponse.json({
      apiVersion: 1,
      ok: result.sent > 0,
      ...result,
    });
  } catch (error) {
    console.error('[api/v1/push/test] POST', error);
    return NextResponse.json({ error: 'Échec de l’envoi du push test' }, { status: 500 });
  }
}
