import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { isCoachConfigured } from '@/lib/ai';
import { runActivityNarrativeAnalysis } from '@/lib/activity/narrative/activity-narrative';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { checkRateLimit, rateLimitResponseBody, rateLimiters } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

const narrativeRequestSchema = z.object({
  force: z.boolean().optional(),
  wait: z.boolean().optional(),
});

async function checkNarrativeRateLimit(
  athleteId: string,
  activityId: string,
): Promise<NextResponse | null> {
  const rateLimit = await checkRateLimit(
    rateLimiters.activityNarrative,
    `${athleteId}:${activityId}`,
  );
  if (rateLimit.ok) {
    return null;
  }
  return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), { status: 429 });
}

async function runNarrativeAndRespond(athleteId: string, id: string, force: boolean) {
  const ok = await runActivityNarrativeAnalysis(athleteId, id, { force });
  if (!ok) {
    return NextResponse.json({ error: 'Synthèse impossible' }, { status: 500 });
  }
  const activity = await prisma.activity.findUnique({ where: { id } });
  return NextResponse.json(activity);
}

async function validateNarrativePost(
  athleteId: string,
  id: string,
  request: NextRequest,
): Promise<{ force: boolean; wait: boolean } | NextResponse> {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      { error: 'Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env.' },
      { status: 503 },
    );
  }

  const existing = await prisma.activity.findFirst({
    where: { id, athleteId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = narrativeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  return { force: parsed.data.force ?? false, wait: parsed.data.wait ?? false };
}

/** Generate or refresh the coach narrative for an activity (survives client leave via after). */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const validated = await validateNarrativePost(athleteId, id, request);
    if (validated instanceof NextResponse) {
      return validated;
    }
    const { force, wait } = validated;

    // A real re-roll (force) is rate-limited per activity — the auto-triggered,
    // non-force path (new imports) is unaffected.
    if (force) {
      const limited = await checkNarrativeRateLimit(athleteId, id);
      if (limited) {
        return limited;
      }
    }

    if (wait) {
      return runNarrativeAndRespond(athleteId, id, force);
    }

    after(async () => {
      try {
        await runActivityNarrativeAnalysis(athleteId, id, { force });
      } catch (error) {
        console.error('[activities/narrative]', id, error);
      }
    });

    return NextResponse.json({ ok: true, status: 'scheduled' });
  } catch (error) {
    console.error('[activities/narrative]', error);
    return NextResponse.json({ error: 'Impossible de lancer la synthèse' }, { status: 500 });
  }
}
