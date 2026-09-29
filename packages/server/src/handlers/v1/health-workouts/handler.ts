import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { onProviderSyncCompleted } from '@sharpit/server/lib/athlete-state/orchestrator';
import {
  appleHealthWorkoutSchema,
  importAppleHealthWorkouts,
} from '@sharpit/server/lib/integrations/apple-health/apple-health-workouts';
import { getGarminAccount } from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import { getStravaAccount } from '@sharpit/server/lib/integrations/strava/strava-sync';
import { athleteHasHealthDataConsent } from '@sharpit/server/lib/privacy/consent-store';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';

const bodySchema = z.object({
  source: z.literal('apple-health'),
  workouts: z.array(appleHealthWorkoutSchema).max(10),
});

/**
 * Receives Apple Health workouts from the native app. Taken only when no Garmin or Strava
 * account is connected — those stay the reference for sessions (ADR-043) — so the answer
 * says `acceptsWorkouts: false` and the app stops sending.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Séances Apple Santé invalides' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    if (!(await athleteHasHealthDataConsent(athleteId))) {
      return NextResponse.json({ error: 'Consentement santé requis' }, { status: 403 });
    }
    const rateLimit = await checkRateLimit(rateLimiters.appleHealth, `${athleteId}:workouts`);
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    const [garmin, strava] = await Promise.all([
      getGarminAccount(athleteId),
      getStravaAccount(athleteId),
    ]);
    if (garmin || strava) {
      return NextResponse.json({
        apiVersion: 1,
        acceptsWorkouts: false,
        imported: 0,
        skipped: parsed.data.workouts.length,
      });
    }

    const result = await importAppleHealthWorkouts(athleteId, parsed.data.workouts);
    if (result.activityIds.length > 0) {
      await onProviderSyncCompleted(athleteId, [
        {
          provider: 'apple-health',
          imported: result.imported,
          updated: 0,
          observationCount: 0,
          activityIds: result.activityIds,
        },
      ]).catch((error) => {
        console.error('[api/v1/health-workouts] refresh', error);
      });
    }
    return NextResponse.json({
      apiVersion: 1,
      acceptsWorkouts: true,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('[api/v1/health-workouts]', error);
    return NextResponse.json(
      { error: 'Envoi des séances Apple Santé impossible' },
      { status: 500 },
    );
  }
}
