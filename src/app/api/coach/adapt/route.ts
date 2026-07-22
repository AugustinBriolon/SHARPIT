import { generateText, Output } from 'ai';
import { addDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NextResponse } from 'next/server';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from '@/lib/ai';
import { buildCoachContext, formatCoachContext } from '@/lib/coach/coach-context';
import { getPlannedSessions } from '@/lib/queries';
import { intensityLabels } from '@/lib/planned-session/sessions';
import {
  adaptPlanGenerationSchema,
  adaptPlanSchema,
  adaptRequestSchema,
  type AdaptPlan,
} from '@/lib/validators/coach';
import { buildGateContext } from '@/lib/plan-gate/build-context';
import { evaluatePlan } from '@/lib/plan-gate/evaluate-plan';
import type { GateProposal, GateResult } from '@/lib/plan-gate/types';
import { computeTrainingDayId } from '@/lib/training/training-day';
import { buildDecisionSnapshotContext } from '@/lib/decision-memory/build-snapshot-context';
import { createCoachingDecision } from '@/lib/decision-memory/repository';

type AdaptChange = AdaptPlan['changes'][number];
type UpcomingSession = Awaited<ReturnType<typeof getPlannedSessions>>[number];

/** Merges a MODIFY's partial fields onto the current session so date/type-dependent
 * rules (weekly load, recovery spacing, ...) evaluate the resulting state, not a
 * half-empty proposal. ADD proposals use the change's own fields directly. */
function toGateProposal(
  change: AdaptChange,
  existing: UpcomingSession | null,
): GateProposal | null {
  const date = change.date ?? (existing ? format(existing.date, 'yyyy-MM-dd') : null);
  const type = change.type ?? existing?.type ?? null;
  if (!date || !type) return null;

  return {
    sessionId: change.sessionId,
    action: change.action === 'ADD' ? 'ADD' : 'MODIFY',
    date,
    startTime: null,
    type,
    intensity: change.intensity ?? existing?.intensity ?? null,
    durationMin: change.durationMin ?? existing?.durationMin ?? null,
    load: change.load ?? existing?.load ?? null,
    title: change.title ?? existing?.title ?? null,
    rationale: change.reason ?? null,
  };
}

export const maxDuration = 60;

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

const SYSTEM_PROMPT = `Tu es un entraîneur expert en endurance. À partir de l'état de forme de l'athlète, de ce qu'il a RÉELLEMENT réalisé récemment (avec analyses prévu/réalisé) et de ses séances DÉJÀ PLANIFIÉES à venir, propose des ajustements pertinents du plan.

Pour chaque ajustement, choisis une action :
- MODIFY : modifier une séance existante (référence son sessionId, indique les champs à changer).
- REMOVE : supprimer une séance existante (sessionId).
- ADD : ajouter une nouvelle séance (sessionId=null, fournis une date yyyy-MM-dd dans la fenêtre).

Principes :
- Si l'athlète a fait plus dur/long que prévu (fatigue accrue), allège ou recule les séances clés.
- S'il a fait plus facile ou manqué, tu peux densifier raisonnablement.
- Respecte la périodisation vers la course et la règle 80/20.
- Ne propose QUE des changements utiles : laisse les séances déjà bonnes telles quelles (ne les liste pas).
- Renseigne uniquement les champs à modifier pour MODIFY ; mets null ailleurs.
- durationMin et load doivent être des entiers (pas de décimales).
Réponds en français.`;

function adaptErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/gateway|fetch failed|ECONNREFUSED|ETIMEDOUT|network/i.test(message)) {
    return 'Connexion au coach IA impossible. Vérifie ta connexion réseau (proxy, VPN, partage de connexion).';
  }
  if (/schema|validation|object/i.test(message)) {
    return 'Le coach a renvoyé une réponse invalide. Réessaie dans un instant.';
  }
  return 'La réadaptation a échoué. Réessaie dans un instant.';
}

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error: 'Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans .env.',
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = adaptRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }
    const { days = 14, focus } = parsed.data;

    const today = startOfDay(new Date());
    const horizon = addDays(today, days);

    const [ctx, upcoming] = await Promise.all([
      buildCoachContext(today),
      getPlannedSessions({ from: today, to: horizon }),
    ]);

    const upcomingLines = upcoming.map((p) => {
      const bits = [
        `id=${p.id}`,
        format(p.date, 'EEE d MMM', { locale: fr }),
        TYPE_FR[p.type] ?? p.type,
        p.intensity ? intensityLabels[p.intensity] : null,
        p.durationMin ? `${p.durationMin} min` : null,
        p.load ? `${Math.round(p.load)} TSS` : null,
        p.title ? `"${p.title}"` : null,
        p.brickGroupId ? '[brick]' : null,
        p.completed ? '[réalisée]' : null,
      ]
        .filter(Boolean)
        .join(' · ');
      return `- ${bits}`;
    });

    const prompt = `${focus ? `Demande de l'athlète : ${focus}\n\n` : ''}Fenêtre d'ajustement : du ${format(today, 'd MMM', { locale: fr })} au ${format(horizon, 'd MMM yyyy', { locale: fr })} (dates ADD au format yyyy-MM-dd dans cette fenêtre).

${formatCoachContext(ctx)}

## Séances déjà planifiées à venir (à ajuster)
${upcomingLines.length ? upcomingLines.join('\n') : 'Aucune séance planifiée à venir.'}`;

    const { output } = await generateText({
      model: COACH_MODEL,
      output: Output.object({ schema: adaptPlanGenerationSchema }),
      system: SYSTEM_PROMPT,
      prompt,
      providerOptions: coachGatewayOptions,
    });

    const validated = adaptPlanSchema.safeParse(output);
    if (!validated.success) {
      console.error('[coach/adapt] validation', validated.error.flatten());
      return NextResponse.json(
        { error: 'Le coach a renvoyé une réponse invalide. Réessaie.' },
        { status: 500 },
      );
    }

    const existingById = new Map(upcoming.map((s) => [s.id, s] as const));

    // REMOVE changes bypass the Gate entirely — there is no new session content to validate.
    // Pair each change with its proposal explicitly (toGateProposal can return null even for
    // a non-REMOVE change) so decisionIds always attach to the right change afterward.
    const gatedPairs = validated.data.changes
      .filter((c) => c.action !== 'REMOVE')
      .map((change) => ({
        change,
        proposal: toGateProposal(
          change,
          change.sessionId ? (existingById.get(change.sessionId) ?? null) : null,
        ),
      }))
      .filter(
        (pair): pair is { change: AdaptChange; proposal: GateProposal } => pair.proposal != null,
      );
    const proposals = gatedPairs.map((pair) => pair.proposal);

    let gate: GateResult = { sessions: [], planLevelFindings: [] };
    const decisionIdByChange = new Map<AdaptChange, string>();
    if (proposals.length > 0) {
      const { context: gateContext, snapshot } = await buildGateContext({
        trainingDayId: computeTrainingDayId(today),
        proposals,
      });
      gate = evaluatePlan(gateContext, proposals);

      const snapshotContext = buildDecisionSnapshotContext(snapshot);
      const decisions = await Promise.all(
        gate.sessions.map((sessionResult) =>
          createCoachingDecision({
            trainingDayId: computeTrainingDayId(
              new Date(`${sessionResult.proposal.date}T00:00:00`),
            ),
            source: 'PLAN_ADAPTER',
            proposal: sessionResult.proposal,
            gateResult: sessionResult,
            snapshotContext,
            snapshotIdAtRecommendation: snapshot.snapshotId,
          }),
        ),
      );
      gatedPairs.forEach((pair, i) => decisionIdByChange.set(pair.change, decisions[i].id));
    }

    const changesWithDecisionId = validated.data.changes.map((change) => ({
      ...change,
      decisionId: decisionIdByChange.get(change) ?? null,
    }));

    return NextResponse.json({ ...validated.data, changes: changesWithDecisionId, gate });
  } catch (error) {
    console.error('[coach/adapt]', error);
    return NextResponse.json({ error: adaptErrorMessage(error) }, { status: 500 });
  }
}
