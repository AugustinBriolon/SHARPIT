import { addDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NextResponse } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { buildCoachContext, formatCoachContext } from '@/lib/coach/coach-context';
import {
  COACH_PROGRESS_HEADERS,
  encodeCoachProgressEvent,
  type CoachProgressEvent,
} from '@/lib/coach/coach-progress-stream';
import { runStructuredCoachStream } from '@/lib/coach/stream-structured-generation';
import { buildBusySummary } from '@/lib/coach/calendar-availability';
import { getGoalById } from '@/lib/queries';
import { coachPlanRequestSchema, coachPlanSchema, type CoachPlan } from '@/lib/validators/coach';
import { buildGateContext } from '@/lib/plan-gate/build-context';
import { evaluatePlan } from '@/lib/plan-gate/evaluate-plan';
import type { GateProposal } from '@/lib/plan-gate/types';
import { computeTrainingDayId } from '@/lib/training/training-day';
import { buildDecisionSnapshotContext } from '@/lib/decision-memory/build-snapshot-context';
import { createCoachingDecision } from '@/lib/decision-memory/repository';
import {
  formatTravelConstraintPromptRule,
  resolvePlanTargetUnderTravel,
} from '@/lib/travel-context/training-constraint';

// Same long-running reasoning generation as adapt — see maxDuration comment there.
export const maxDuration = 300;

// Kept deliberately short. A 10 872-char version of this prompt made the model
// abandon the output schema entirely — inventing field names and enum values —
// while the same schema and context with a brief prompt produced 8 valid
// sessions. Domain rules stay; prose padding does not.
const SYSTEM_PROMPT = `Tu es un entraîneur d'élite en endurance (triathlon, course, vélo, natation). Tu proposes des séances précises et sûres à partir des données réelles fournies. Jamais de plan générique. Réponds en français.

Règles :
- Périodise vers la course principale (base → spécifique → affûtage) selon les semaines restantes.
- Module selon TSB et récupération : fatigué (TSB très négatif, readiness basse) → récup/endurance ; frais → séances clés.
- Respecte les jours d'entraînement habituels ; repos ailleurs. Ne duplique pas ce qui est déjà planifié.
- 80/20 : majorité d'endurance, 2-3 séances qualité/semaine max, surcharge progressive.
- Cibles concrètes depuis les seuils (FC via LTHR/FC max, puissance via FTP, allure via allure seuil). Seuil manquant → RPE/zones, et signale-le.
- TSS réaliste par séance. Description concrète : échauffement, corps (répétitions, durées, zones), récupération.
- Exploite la conformité prévu/réalisé et le ressenti (RPE, feeling).

Sécurité (impératif) :
- Respecte ABSOLUMENT la condition physique déclarée : n'aggrave jamais une zone sensible, baisse l'intensité, cible renfo/mobilité. Réduis la charge dès que la récupération signale une fatigue excessive.
- Dès qu'un objectif sportif est présent, inclus dans la fenêtre — sauf voyage MOBILITY_ONLY/NONE ou capacité REST_ONLY — au moins une séance STRENGTH préventive spécifique au sport (stabilisateurs, chaîne postérieure, core, hanches/genoux/épaules) ET un bloc mobilité/étirements ciblés. Non optionnels.
- Information manquante → hypothèse CONSERVATRICE. N'invente jamais de données.

Sortie : le schéma fait autorité pour les noms de champs, les types et les valeurs d'énumération — jamais ce texte. N'ajoute aucun champ hors schéma. Séance STRENGTH : strengthPrescription obligatoire (3–8 exercices, noms français) ; RUN/BIKE/SWIM : null.`;

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error:
          'Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans le fichier .env (Vercel → AI Gateway → API Keys), puis redémarre le serveur.',
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = coachPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
  }

  const { startDate, days = 7, focus, goalId, targetLoad, planPhase, planFocus } = parsed.data;
  const start = startOfDay(startDate ?? new Date());

  const [ctx, busySummary, goal] = await Promise.all([
    buildCoachContext(start, { includeScenario: true }),
    buildBusySummary(start, days),
    goalId ? getGoalById(goalId) : Promise.resolve(null),
  ]);
  const contextText = formatCoachContext(ctx);

  const travelWindows = (ctx.travel ?? []).map((t) => ({
    startDate: new Date(`${t.startDate}T00:00:00`),
    endDate: new Date(`${t.endDate}T00:00:00`),
    label: t.label,
    trainingConstraint: t.trainingConstraint,
    allowedDisciplines: t.allowedDisciplines ?? [],
  }));
  const travelResolved = resolvePlanTargetUnderTravel({
    startDate: start,
    days,
    targetLoad,
    planFocus,
    travels: travelWindows,
  });
  const effectiveTargetLoad = travelResolved.targetLoad;
  const effectivePlanFocus = travelResolved.planFocus;

  let goalBlock = '';
  if (goal) {
    const daysToGo = goal.targetDate
      ? Math.round((startOfDay(goal.targetDate).getTime() - start.getTime()) / 86400_000)
      : null;
    const bits = [
      `Objectif ciblé : ${goal.title}`,
      goal.location ? `lieu ${goal.location}` : null,
      goal.targetDate ? `date ${format(goal.targetDate, 'd MMMM yyyy', { locale: fr })}` : null,
      daysToGo != null ? `dans ${daysToGo} jours (~${Math.round(daysToGo / 7)} semaines)` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    goalBlock = `\n\n## Objectif prioritaire pour ce bloc
${bits}
Périodise IMPÉRATIVEMENT ce bloc en fonction de cette échéance (base → spécifique → affûtage selon les semaines restantes). Oriente le contenu des séances vers les exigences de cet objectif.`;
  }

  let macroBlock = '';
  if (effectiveTargetLoad != null || planPhase || effectivePlanFocus) {
    const bits = [
      planPhase ? `Phase du macro-plan : ${planPhase}` : null,
      effectiveTargetLoad != null
        ? `Charge hebdomadaire cible : ${effectiveTargetLoad} TSS (répartis sur les séances du bloc)`
        : null,
      effectivePlanFocus ? `Focus de la semaine : ${effectivePlanFocus}` : null,
    ].filter(Boolean);
    macroBlock = `\n\n## Macro-plan de la semaine
${bits.join('\n')}
Calibre le volume et l'intensité des séances pour approcher cette charge cible sans la dépasser de plus de 10 %.`;
    if (travelResolved.constraint || travelResolved.allowedDisciplines.length > 0) {
      macroBlock += `\n${formatTravelConstraintPromptRule(
        travelResolved.constraint,
        travelResolved.allowedDisciplines,
      )}`;
    }
  }

  const agendaBlock = busySummary
    ? `\n\n## Agenda de l'athlète (créneaux occupés à éviter)
Place chaque séance à une heure LIBRE ('startTime' au format HH:mm), entre 06:00 et 21:00, jamais la nuit. Ne surcharge pas un jour déjà très occupé : si une journée est pleine, allège ou déplace la séance. Vérifie que la durée de la séance tient dans un créneau libre.
${busySummary}`
    : `\n\n## Agenda
Aucun agenda connecté : propose des heures réalistes ('startTime' entre 06:00 et 21:00) ou laisse 'startTime' à null.`;

  const prompt = `Génère un plan d'entraînement couvrant ${days} jour(s) à partir du ${format(
    start,
    'EEEE d MMMM yyyy',
    { locale: fr },
  )} (dayOffset 0 = ce jour-là, dayOffset 1 = lendemain, etc.).

${focus ? `Demande spécifique de l'athlète : ${focus}\n\n` : ''}Données de l'athlète :

${contextText}${goalBlock}${macroBlock}${agendaBlock}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: CoachProgressEvent<PlanPayload, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeCoachProgressEvent(event)));
        } catch {
          // Athlete navigated away mid-generation — stop writing, let it unwind.
          closed = true;
        }
      };

      try {
        const output = await runStructuredCoachStream({
          schema: coachPlanSchema,
          system: SYSTEM_PROMPT,
          prompt,
          onReasoning: (delta) => send({ type: 'reasoning', delta }),
          onPartial: (value) => send({ type: 'partial', value }),
        });
        send({ type: 'result', value: await finalizePlan(output, start, goalId ?? null) });
      } catch (error) {
        console.error('[coach/plan]', error);
        send({ type: 'error', message: 'La génération a échoué. Réessaie dans un instant.' });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: COACH_PROGRESS_HEADERS });
}

export type PlanPayload = {
  summary: string;
  startDate: string;
  sessions: (CoachPlan['sessions'][number] & {
    date: string;
    startTime: string | null;
    decisionId: string;
  })[];
  gate: ReturnType<typeof evaluatePlan>;
};

/** Dates the proposed sessions, runs the Gate and records the coaching decisions. */
async function finalizePlan(
  rawOutput: unknown,
  start: Date,
  goalId: string | null,
): Promise<PlanPayload> {
  {
    const output = coachPlanSchema.parse(rawOutput);

    const sessions = [...output.sessions]
      .sort((a, b) => a.dayOffset - b.dayOffset)
      .map((s) => ({
        ...s,
        date: format(addDays(start, s.dayOffset), 'yyyy-MM-dd'),
        startTime: s.startTime ?? null,
      }));

    const proposals: GateProposal[] = sessions.map((s) => ({
      sessionId: null,
      action: 'ADD',
      date: s.date,
      startTime: s.startTime,
      type: s.type,
      intensity: s.intensity,
      durationMin: s.durationMin,
      load: s.load,
      title: s.title,
      rationale: s.rationale ?? null,
      goalId: goalId ?? null,
    }));

    const { context: gateContext, snapshot } = await buildGateContext({
      trainingDayId: computeTrainingDayId(start),
      proposals,
      goalId,
    });
    const gate = evaluatePlan(gateContext, proposals);

    const snapshotContext = buildDecisionSnapshotContext(snapshot);
    const decisionIds = await Promise.all(
      gate.sessions.map((sessionResult) =>
        createCoachingDecision({
          trainingDayId: computeTrainingDayId(new Date(`${sessionResult.proposal.date}T00:00:00`)),
          source: 'PLAN_GENERATOR',
          proposal: sessionResult.proposal,
          gateResult: sessionResult,
          snapshotContext,
          snapshotIdAtRecommendation: snapshot.snapshotId,
        }),
      ),
    ).then((decisions) => decisions.map((d) => d.id));

    const sessionsWithDecisionId = sessions.map((s, i) => ({ ...s, decisionId: decisionIds[i] }));

    return {
      summary: output.summary,
      startDate: format(start, 'yyyy-MM-dd'),
      sessions: sessionsWithDecisionId,
      gate,
    };
  }
}
