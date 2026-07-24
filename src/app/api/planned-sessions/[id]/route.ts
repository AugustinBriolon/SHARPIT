import { NextRequest, NextResponse } from 'next/server';
import { deleteSessionFromGoogle, pushSessionToGoogle } from '@/lib/integrations/google-sync';
import { deletePlannedSession, getPlannedSessionById, updatePlannedSession } from '@/lib/queries';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';
import { updatePlannedSessionSchema } from '@/lib/validators/planned-session';
import {
  findCoachingDecisionById,
  findDecisionForPlannedSession,
  recordDecisionAction,
} from '@/lib/decision-memory/repository';
import { garminPushClearOnSessionChange } from '@/lib/integrations/garmin-workout-push-state';

type RouteContext = { params: Promise<{ id: string }> };

/** Fields that change what the session actually asks the athlete to do. */
const SESSION_DEFINING_FIELDS = [
  'intensity',
  'durationMin',
  'load',
  'type',
  'date',
  'strengthPrescription',
] as const;

function changesSessionDefiningField(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): boolean {
  return SESSION_DEFINING_FIELDS.some((field) => {
    if (!(field in patch)) return false;
    const before = existing[field];
    const after = patch[field];
    if (before instanceof Date || after instanceof Date) {
      return (
        new Date(before as Date | string).getTime() !== new Date(after as Date | string).getTime()
      );
    }
    return before !== after;
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { decisionId, ...sessionBody } = body as { decisionId?: string };
    const parsed = updatePlannedSessionSchema.safeParse(sessionBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getPlannedSessionById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance planifiée introuvable' }, { status: 404 });
    }

    // Same server-side enforcement as POST /api/planned-sessions — a Gate-rejected
    // proposal must never be applied via a direct API call either.
    if (decisionId) {
      const decision = await findCoachingDecisionById(decisionId);
      if (decision?.gateResult.status === 'REJECTED') {
        return NextResponse.json(
          { error: 'Cette proposition a été rejetée par le Gate et ne peut pas être appliquée.' },
          { status: 422 },
        );
      }
    }

    const clearGarminPush = garminPushClearOnSessionChange(parsed.data);
    const session = await updatePlannedSession(id, {
      ...(parsed.data as Parameters<typeof updatePlannedSession>[1]),
      ...(clearGarminPush ?? {}),
    });

    // Athlete applying a coach-proposed adapt change → ACCEPTED. Otherwise, if this
    // session already originated from a coach recommendation and the edit touches a
    // session-defining field, it's an unprompted override. Both are best-effort:
    // an audit-log failure must never fail the underlying session update.
    try {
      if (decisionId) {
        await recordDecisionAction({
          decisionId,
          actionType: 'ACCEPTED',
          source: 'PLAN_REVIEW_UI',
          resultingPlannedSessionId: id,
        });
      } else if (
        changesSessionDefiningField(
          existing as unknown as Record<string, unknown>,
          parsed.data as Record<string, unknown>,
        )
      ) {
        const priorDecision = await findDecisionForPlannedSession(id);
        if (priorDecision) {
          await recordDecisionAction({
            decisionId: priorDecision.id,
            actionType: 'OVERRIDDEN',
            source: 'CALENDAR_EDIT',
            resultingPlannedSessionId: id,
          });
        }
      }
    } catch (decisionError) {
      console.error('[planned-sessions/decision-action]', decisionError);
    }

    // Reflète la modification dans Google Calendar (best-effort).
    try {
      await pushSessionToGoogle(session);
    } catch (syncError) {
      console.error('Push Google Calendar échoué', syncError);
    }

    try {
      await refreshAndPersistPlannedSessionContext(id);
    } catch (ctxError) {
      console.error('[planned-sessions/context]', ctxError);
    }

    const fresh = await getPlannedSessionById(id);
    return NextResponse.json(fresh ?? session);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour la séance planifiée' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Supprime l'événement Google associé avant de supprimer la séance (best-effort).
    const existing = await getPlannedSessionById(id);
    if (existing?.googleEventId) {
      try {
        await deleteSessionFromGoogle(existing);
      } catch (syncError) {
        console.error('Suppression Google Calendar échouée', syncError);
      }
    }

    await deletePlannedSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de supprimer la séance planifiée' },
      { status: 500 },
    );
  }
}
