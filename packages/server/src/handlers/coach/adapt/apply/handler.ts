import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildAdaptBatchOps,
  type AdaptExistingSession,
} from '@sharpit/app/lib/coach/plan/adapt-batch-ops';
import type { AdaptChange } from '@sharpit/app/lib/coach/plan/adapt-types';
import { adaptPlanSchema } from '@sharpit/app/lib/validators/coach';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { getPlannedSessionById } from '@sharpit/server/lib/queries';
import { loadAdaptDefaultGoalId } from '@sharpit/server/handlers/coach/adapt/handler';
import { createPlannedSessionFromBody } from '@sharpit/server/handlers/planned-sessions/handler';
import {
  deletePlannedSessionWithEvent,
  patchPlannedSessionFromBody,
} from '@sharpit/server/handlers/planned-sessions/[id]/handler';

const applyBodySchema = z.object({
  changes: z
    .array(adaptPlanSchema.shape.changes.element.extend({ decisionId: z.string().nullish() }))
    .min(1)
    .max(20),
});

/** The sessions the changes modify, read before anything is written; null when one is gone. */
async function loadModifiedSessions(athleteId: string, changes: readonly AdaptChange[]) {
  const ids = [
    ...new Set(
      changes.filter((c) => c.action !== 'ADD' && c.sessionId).map((c) => c.sessionId as string),
    ),
  ];
  const sessions = await Promise.all(ids.map((id) => getPlannedSessionById(athleteId, id)));
  if (sessions.some((session) => !session)) {
    return null;
  }
  return new Map<string, AdaptExistingSession>(
    sessions.map((session) => [session!.id, session as unknown as AdaptExistingSession]),
  );
}

/**
 * Applies the coach adjustments the athlete kept — the native twin of the web adapter's
 * « Appliquer », through the same mapping (`buildAdaptBatchOps`), so the coach's prescriptions
 * are stored whichever client applies them. Every session a change touches is checked before
 * the first write.
 */
export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const parsed = applyBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const changes = parsed.data.changes.map((c) => ({ ...c, decisionId: c.decisionId ?? null }));
    const sessionsById = await loadModifiedSessions(athleteId, changes);
    if (!sessionsById) {
      return NextResponse.json(
        { error: 'Une séance à ajuster n’existe plus. Relance l’ajustement.' },
        { status: 409 },
      );
    }

    const ops = buildAdaptBatchOps(changes, sessionsById, await loadAdaptDefaultGoalId(athleteId));
    for (const op of ops) {
      if (op.op === 'remove') {
        await deletePlannedSessionWithEvent(athleteId, op.id);
        continue;
      }
      const written =
        op.op === 'create'
          ? await createPlannedSessionFromBody(athleteId, op.payload)
          : await patchPlannedSessionFromBody(athleteId, op.id, op.data);
      if ('response' in written) {
        return written.response;
      }
    }
    return NextResponse.json({ applied: ops.length });
  } catch (error) {
    console.error('[coach/adapt/apply]', error);
    return NextResponse.json({ error: 'Impossible d’appliquer les ajustements' }, { status: 500 });
  }
}
