import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { refreshAthleteState } from '@sharpit/server/lib/athlete-state/orchestrator';
import { appleHealthPatch } from '@sharpit/server/lib/integrations/apple-health/apple-health-merge';
import { getGarminAccount } from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import { prisma } from '@sharpit/db/client';
import { athleteHasHealthDataConsent } from '@sharpit/server/lib/privacy/consent-store';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';

const minutes = z.number().int().min(0).max(1_440).nullish();

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepMinutes: minutes,
  sleepDeepMin: minutes,
  sleepRemMin: minutes,
  sleepLightMin: minutes,
  sleepAwakeMin: minutes,
  sleepBedtimeMin: z.number().int().min(0).max(1_439).nullish(),
  sleepWakeMin: z.number().int().min(0).max(1_439).nullish(),
  restingHr: z.number().int().min(20).max(250).nullish(),
  hrv: z.number().int().min(1).max(500).nullish(),
  totalSteps: z.number().int().min(0).max(200_000).nullish(),
  calories: z.number().int().min(0).max(20_000).nullish(),
  weightKg: z.number().min(20).max(400).nullish(),
});

const bodySchema = z.object({
  source: z.literal('apple-health'),
  days: z.array(daySchema).max(31),
});

/** The day row as stored — DailyHealth dates are UTC midnights of the calendar day. */
function dayKey(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Writes each day's patch; returns how many days changed. */
async function applyAppleHealthDays(
  athleteId: string,
  days: z.infer<typeof daySchema>[],
  garminConnected: boolean,
): Promise<number> {
  let updatedDays = 0;
  for (const day of days) {
    const date = dayKey(day.date);
    const existing = await prisma.dailyHealth.findUnique({
      where: { athleteId_date: { athleteId, date } },
    });
    const patch = appleHealthPatch(existing, day, { garminConnected });
    if (Object.keys(patch).length === 0) {
      continue;
    }
    await prisma.dailyHealth.upsert({
      where: { athleteId_date: { athleteId, date } },
      create: { athleteId, date, ...patch },
      update: patch,
    });
    updatedDays += 1;
  }
  return updatedDays;
}

/**
 * Receives Apple Health day summaries from the native app. Apple Health fills what no
 * provider wrote; it never overwrites. See ADR-043.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données Apple Santé invalides' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    if (!(await athleteHasHealthDataConsent(athleteId))) {
      return NextResponse.json({ error: 'Consentement santé requis' }, { status: 403 });
    }
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:apple-health`);
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    const garminConnected = Boolean(await getGarminAccount(athleteId));
    const updatedDays = await applyAppleHealthDays(athleteId, parsed.data.days, garminConnected);

    if (updatedDays > 0) {
      await refreshAthleteState(athleteId, { source: 'today_refresh' }).catch((error) => {
        console.error('[api/v1/health-samples] refresh', error);
      });
    }
    return NextResponse.json({ apiVersion: 1, updatedDays });
  } catch (error) {
    console.error('[api/v1/health-samples]', error);
    return NextResponse.json({ error: 'Envoi Apple Santé impossible' }, { status: 500 });
  }
}
