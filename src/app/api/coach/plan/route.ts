import { generateText, Output } from 'ai';
import { addDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NextResponse } from 'next/server';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from '@/lib/ai';
import { buildCoachContext, formatCoachContext } from '@/lib/coach-context';
import { getUpcomingBusy } from '@/lib/integrations/google-sync';
import { getGoalById } from '@/lib/queries';
import { coachPlanRequestSchema, coachPlanSchema } from '@/lib/validators/coach';
import { buildGateContext } from '@/lib/plan-gate/build-context';
import { evaluatePlan } from '@/lib/plan-gate/evaluate-plan';
import type { GateProposal } from '@/lib/plan-gate/types';
import { computeTrainingDayId } from '@/lib/training-day';
import { buildDecisionSnapshotContext } from '@/lib/decision-memory/build-snapshot-context';
import { createCoachingDecision } from '@/lib/decision-memory/repository';
import {
  formatTravelConstraintPromptRule,
  resolvePlanTargetUnderTravel,
} from '@/lib/travel-context/training-constraint';

/** Résume les créneaux occupés Google par jour, sur la fenêtre du plan. */
async function buildBusySummary(start: Date, days: number): Promise<string> {
  try {
    const busy = await getUpcomingBusy(days + 1);
    if (busy.length === 0) return '';

    const byDay = new Map<string, string[]>();
    for (const b of busy) {
      const list = byDay.get(b.dayKey) ?? [];
      list.push(`${b.start}–${b.end}`);
      byDay.set(b.dayKey, list);
    }

    const lines: string[] = [];
    for (let i = 0; i <= days; i += 1) {
      const day = addDays(start, i);
      const key = format(day, 'yyyy-MM-dd');
      const slots = byDay.get(key);
      const label = `${format(day, 'EEE d MMM', { locale: fr })} (dayOffset ${i})`;
      if (slots && slots.length) {
        lines.push(`- ${label} : occupé ${slots.join(', ')}`);
      } else {
        lines.push(`- ${label} : libre toute la journée`);
      }
    }
    return lines.join('\n');
  } catch (error) {
    console.error('[coach/plan] busy summary', error);
    return '';
  }
}

export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es un entraîneur d'élite en sports d'endurance (triathlon, course à pied, cyclisme, natation), spécialiste de la périodisation, de la physiologie de l'effort et du développement à long terme.

Ta mission : proposer des séances précises, personnalisées et sûres à partir des données réelles de l'athlète fournies ci-dessous. Jamais de plan générique.

Avant de générer, évalue : fatigue actuelle, capacité de récupération, charge accumulée, proximité des courses, progression récente, risque de blessure, temps disponible, cohérence long terme. N'optimise jamais le court terme au détriment de la progression.

Principes à respecter impérativement :
- Périodise vers la course principale (base → spécifique → affûtage). Adapte le volume et l'intensité au nombre de semaines restantes.
- Ajuste selon la fraîcheur (TSB) et la récupération (readiness, HRV, sommeil) : si l'athlète est fatigué (TSB très négatif, readiness basse), propose de la récup/endurance ; s'il est frais, place les séances clés.
- Respecte les jours d'entraînement habituels de l'athlète. Place le repos sur les autres jours.
- Évite de dupliquer ce qui est déjà planifié.
- Règle 80/20 : majorité d'endurance, séances intenses dosées (en général 2-3 séances qualité par semaine max). Surcharge progressive, sans hausse irréaliste de volume/intensité.
- Donne des cibles concrètes basées sur les seuils de l'athlète (zones FC à partir de LTHR/FC max, puissance à partir de la FTP, allures à partir de l'allure seuil). Si les seuils manquent, raisonne en RPE/zones et signale-le.
- Estime une charge (TSS) réaliste par séance.
- Tiens compte de l'exécution récente (conformité prévu/réalisé) et du ressenti (RPE, feeling) : si les dernières séances clés ont été manquées ou trop dures, ajuste en conséquence.
- Respecte IMPÉRATIVEMENT la condition physique déclarée (douleurs, blessures, mobilité) : n'aggrave jamais une zone sensible, propose du renfo/mobilité ciblé et baisse l'intensité si besoin. Réduis la charge dès que la récupération signale une fatigue excessive.
- Sois concret dans la description : échauffement, corps de séance (répétitions, durées, allures/zones), récupération.
- Si une information manque, fais des hypothèses CONSERVATRICES plutôt qu'agressives. N'invente jamais de données.

Réponds toujours en français.`;

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
    buildCoachContext(start),
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

  try {
    const { output } = await generateText({
      model: COACH_MODEL,
      output: Output.object({ schema: coachPlanSchema }),
      system: SYSTEM_PROMPT,
      prompt,
      providerOptions: coachGatewayOptions,
    });

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

    return NextResponse.json({
      summary: output.summary,
      startDate: format(start, 'yyyy-MM-dd'),
      sessions: sessionsWithDecisionId,
      gate,
    });
  } catch (error) {
    console.error('[coach/plan]', error);
    return NextResponse.json(
      { error: 'La génération a échoué. Réessaie dans un instant.' },
      { status: 500 },
    );
  }
}
