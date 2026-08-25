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

/** Generate or refresh the coach narrative for an activity (survives client leave via after). */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
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
    // Idempotent by default — runActivityNarrativeAnalysis() already skips a
    // re-roll when narrativeAnalyzedAt is set unless force is explicitly true.
    // This used to default force to true whenever the body omitted it, making
    // every call regenerate regardless of intent.
    const { force = false, wait = false } = parsed.data;

    // A real re-roll (force) is rate-limited per activity — the auto-triggered,
    // non-force path (new imports) is unaffected.
    if (force) {
      const rateLimit = await checkRateLimit(rateLimiters.activityNarrative, `${athleteId}:${id}`);
      if (!rateLimit.ok) {
        return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), {
          status: 429,
        });
      }
    }

    if (wait) {
      const ok = await runActivityNarrativeAnalysis(athleteId, id, { force });
      if (!ok) {
        return NextResponse.json({ error: 'Synthèse impossible' }, { status: 500 });
      }
      const activity = await prisma.activity.findUnique({ where: { id } });
      return NextResponse.json(activity);
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
