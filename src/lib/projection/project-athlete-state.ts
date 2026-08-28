/**
 * Projected Athlete State — deterministic orchestrator.
 *
 * Current Athlete State + Planned Sessions + PMC forward + Decision Engine.
 * @see docs/product/PROJECTED_ATHLETE_STATE.md
 */

import { runProjectedDecision } from '@/core/decision/projected-decision';
import type {
  ProjectionAssumption,
  ProjectedAthleteState,
  ProjectedAthleteInput,
  ProjectedDayState,
  ProjectedAthleteSummary,
} from '@/core/projection/types';
import { PROJECTION_MODEL_ID } from '@/core/projection/types';
import { localDateLabel } from '@/lib/projection/build-projection-input';
import { projectPmcForward } from '@/lib/projection/pmc-forward';
import {
  projectionConfidenceForDay,
  projectAdaptationIndex,
  projectFatigueIndex,
  projectReadinessScore,
  synthesizeProjectedAdaptation,
  synthesizeProjectedFatigue,
  synthesizeProjectedRecovery,
} from '@/lib/projection/score-projection';
import { addTrainingDays } from '@/lib/training/training-day';
import { resolve } from '@/lib/french';

function projectionHeadlineFromTsb(tsbEnd: number): string {
  if (tsbEnd >= 5) {
    return 'Si tu exécutes ce plan, ta forme devrait remonter sur l’horizon.';
  }
  if (tsbEnd <= -15) {
    return 'Le plan actuel risque d’accumuler de la fatigue — surveille la récupération.';
  }
  return 'Le plan maintient une charge équilibrée sur l’horizon choisi.';
}

const GLOBAL_ASSUMPTIONS: readonly ProjectionAssumption[] = [
  {
    code: 'planned-only-load',
    label: 'Seules les séances planifiées non réalisées alimentent la charge future.',
  },
  {
    code: 'pmc-ewma',
    label: 'La charge (CTL/ATL/TSB) avance via le même EWMA que l’historique (τ CTL=42, ATL=7).',
  },
  {
    code: 'score-linear',
    label:
      'Readiness, fatigue et adaptation projetés = scores actuels + deltas PMC × coefficients documentés.',
  },
  {
    code: 'static-health-env',
    label:
      'Santé physique et environnement du jour restent constants sur l’horizon (pas de nouvelle inférence).',
  },
  {
    code: 'decision-reuse',
    label: 'Le Decision Engine arbitre chaque jour projeté avec une confiance décroissante.',
  },
];

const ENV_CONSTRAINT_LABELS: Record<string, string> = {
  SIGNIFICANT: 'Contrainte environnementale significative',
  MODERATE: 'Contrainte environnementale modérée',
  NONE: 'Aucune contrainte environnementale majeure',
};

function buildFutureDayIds(anchorTrainingDayId: string, horizonDays: number): string[] {
  return Array.from({ length: horizonDays }, (_, index) =>
    addTrainingDays(anchorTrainingDayId, index + 1),
  );
}

function findPeakReadinessDay(days: readonly ProjectedDayState[]): string | null {
  const withReadiness = days.filter((d) => d.physiology.expectedReadiness !== null);
  if (withReadiness.length === 0) {
    return null;
  }
  return withReadiness.reduce((best, day) =>
    (day.physiology.expectedReadiness ?? 0) > (best.physiology.expectedReadiness ?? 0) ? day : best,
  ).trainingDayId;
}

function findHighestRiskDay(days: readonly ProjectedDayState[]): string | null {
  const riskVerdicts = new Set(['RECOVER', 'CAUTION', 'INSUFFICIENT_DATA']);
  const riskDays = days.filter((d) => riskVerdicts.has(d.decision.overallVerdict));
  if (riskDays.length === 0) {
    return null;
  }
  return riskDays.reduce((worst, day) =>
    (day.physiology.expectedReadiness ?? 100) < (worst.physiology.expectedReadiness ?? 100)
      ? day
      : worst,
  ).trainingDayId;
}

function buildSummaryRiskLines(
  days: readonly ProjectedDayState[],
  highestRiskDay: string | null,
): string[] {
  const riskLines: string[] = [];
  if (highestRiskDay) {
    const riskDay = days.find((d) => d.trainingDayId === highestRiskDay);
    if (riskDay) {
      riskLines.push(
        `${riskDay.dateLabel} : readiness attendue ${riskDay.physiology.expectedReadiness ?? '—'} — priorité récupération possible.`,
      );
    }
  }
  const envRiskDay = days.find((d) => d.environment.trainingImpact === 'SIGNIFICANT');
  if (envRiskDay) {
    riskLines.push(`${envRiskDay.dateLabel} : contrainte environnementale significative prévue.`);
  }
  const overloadDay = days.find((d) => d.load.tsb < -20);
  if (overloadDay) {
    riskLines.push(`${overloadDay.dateLabel} : surcharge probable (TSB ${overloadDay.load.tsb}).`);
  }
  return riskLines.slice(0, 3);
}

function computeMainLimitingFactor(days: readonly ProjectedDayState[]): string | null {
  const factorCounts = new Map<string, number>();
  for (const day of days) {
    const domain = day.decision.limitingFactor.domain ?? day.decision.limitingFactor.system;
    if (domain) {
      factorCounts.set(domain, (factorCounts.get(domain) ?? 0) + 1);
    }
  }
  return [...factorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function computePlanningConfidence(days: readonly ProjectedDayState[]): number {
  const total = days.reduce((sum, d) => sum + d.projectionConfidence, 0);
  return Math.round((total / days.length) * 100) / 100;
}

function buildSummary(
  days: readonly ProjectedDayState[],
  anchor: ProjectedAthleteState['anchor'],
): ProjectedAthleteSummary {
  if (days.length === 0) {
    return {
      peakReadinessDay: null,
      highestRiskDay: null,
      mainLimitingFactor: null,
      planningConfidence: 0,
      headline:
        'Aucune projection disponible — planifie des séances pour voir l’évolution attendue.',
      riskLines: [],
    };
  }

  const peakDay = findPeakReadinessDay(days);
  const highestRiskDay = findHighestRiskDay(days);
  const tsbEnd = days[days.length - 1]?.load.tsb ?? anchor.tsb;

  return {
    peakReadinessDay: peakDay,
    highestRiskDay,
    mainLimitingFactor: computeMainLimitingFactor(days),
    planningConfidence: computePlanningConfidence(days),
    headline: projectionHeadlineFromTsb(tsbEnd),
    riskLines: buildSummaryRiskLines(days, highestRiskDay),
  };
}

type ProjectedDayBuildContext = {
  athleteId: string;
  anchorTsb: number;
  initialAtl: number;
  initialCtl: number;
  anchorReadiness: number | null;
  anchorFatigue: number | null;
  anchorAdaptation: number | null;
  recovery: ProjectedAthleteInput['recovery'];
  fatigue: ProjectedAthleteInput['fatigue'];
  adaptation: ProjectedAthleteInput['adaptation'];
  physicalHealth: ProjectedAthleteInput['physicalHealth'];
  environment: ProjectedAthleteInput['environment'];
  plannedTssByDay: ProjectedAthleteInput['plannedTssByDay'];
  environmentalImpactByDay: ProjectedAthleteInput['environmentalImpactByDay'];
  plannedSessionCountByDay: ProjectedAthleteInput['plannedSessionCountByDay'];
  baseFreshnessConfidence: number;
};

function synthesizeProjectedTwinStates(input: {
  ctx: ProjectedDayBuildContext;
  trainingDayId: string;
  expectedReadiness: number | null;
  expectedFatigueIndex: number | null;
  expectedAdaptationIndex: number | null;
  tsb: number;
}) {
  const {
    ctx,
    trainingDayId,
    expectedReadiness,
    expectedFatigueIndex,
    expectedAdaptationIndex,
    tsb,
  } = input;
  const projectedRecovery =
    ctx.recovery !== null
      ? synthesizeProjectedRecovery(ctx.recovery, expectedReadiness, trainingDayId)
      : null;
  const projectedFatigue =
    ctx.fatigue !== null
      ? synthesizeProjectedFatigue(ctx.fatigue, expectedFatigueIndex, trainingDayId, tsb)
      : null;
  const projectedAdaptation =
    ctx.adaptation !== null
      ? synthesizeProjectedAdaptation(ctx.adaptation, expectedAdaptationIndex, trainingDayId)
      : null;
  return { projectedRecovery, projectedFatigue, projectedAdaptation };
}

function buildProjectedPhysiology(input: {
  expectedReadiness: number | null;
  expectedFatigueIndex: number | null;
  expectedAdaptationIndex: number | null;
  projectedRecovery: ReturnType<typeof synthesizeProjectedRecovery> | null;
  projectedFatigue: ReturnType<typeof synthesizeProjectedFatigue> | null;
  projectedAdaptation: ReturnType<typeof synthesizeProjectedAdaptation> | null;
}) {
  const {
    expectedReadiness,
    expectedFatigueIndex,
    expectedAdaptationIndex,
    projectedRecovery,
    projectedFatigue,
    projectedAdaptation,
  } = input;
  return {
    expectedReadiness,
    expectedFatigueIndex,
    expectedAdaptationIndex,
    readinessCategory: projectedRecovery?.readinessCategory ?? null,
    fatigueLevel: projectedFatigue?.fatigueLevel ?? null,
    adaptationStatus: projectedAdaptation?.adaptationStatus ?? null,
  };
}

function buildProjectedDayState(
  trainingDayId: string,
  index: number,
  pmcForward: ReturnType<typeof projectPmcForward>,
  ctx: ProjectedDayBuildContext,
): ProjectedDayState {
  const dayOffset = index + 1;
  const load = pmcForward[index];
  const tsbDelta = load.tsb - ctx.anchorTsb;
  const atlDelta = load.atl - ctx.initialAtl;
  const ctlDelta = load.ctl - ctx.initialCtl;

  const expectedReadiness = projectReadinessScore(ctx.anchorReadiness, tsbDelta);
  const expectedFatigueIndex = projectFatigueIndex(ctx.anchorFatigue, atlDelta);
  const expectedAdaptationIndex = projectAdaptationIndex(ctx.anchorAdaptation, ctlDelta);

  const twins = synthesizeProjectedTwinStates({
    ctx,
    trainingDayId,
    expectedReadiness,
    expectedFatigueIndex,
    expectedAdaptationIndex,
    tsb: load.tsb,
  });

  const envImpact = ctx.environmentalImpactByDay.get(trainingDayId) ?? 'NONE';
  const sessionCount = ctx.plannedSessionCountByDay.get(trainingDayId) ?? 0;
  const { decisionState } = runProjectedDecision({
    trainingDayId,
    athleteId: ctx.athleteId,
    recovery: twins.projectedRecovery,
    fatigue: twins.projectedFatigue,
    adaptation: twins.projectedAdaptation,
    physicalHealth: ctx.physicalHealth,
    environment: ctx.environment,
    dayOffset,
    baseFreshnessConfidence: ctx.baseFreshnessConfidence,
  });

  const plannedTss = ctx.plannedTssByDay.get(trainingDayId) ?? 0;
  const dayAssumptions: ProjectionAssumption[] =
    plannedTss === 0
      ? [{ code: 'rest-day', label: 'Jour sans séance planifiée — charge TSS = 0.' }]
      : [];

  return {
    trainingDayId,
    dayOffset,
    dateLabel: localDateLabel(trainingDayId),
    load: {
      trainingDayId,
      plannedTss: load.tss,
      ctl: load.ctl,
      atl: load.atl,
      tsb: load.tsb,
    },
    physiology: buildProjectedPhysiology({
      expectedReadiness,
      expectedFatigueIndex,
      expectedAdaptationIndex,
      projectedRecovery: twins.projectedRecovery,
      projectedFatigue: twins.projectedFatigue,
      projectedAdaptation: twins.projectedAdaptation,
    }),
    environment: {
      trainingImpact: envImpact,
      sessionCount,
      dominantConstraint: ENV_CONSTRAINT_LABELS[envImpact] ?? null,
    },
    decision: {
      overallVerdict: decisionState.overallVerdict,
      limitingFactor: decisionState.limitingFactor,
      confidence: decisionState.confidence,
      confidenceTier: decisionState.confidenceTier,
      priority: decisionState.priority,
      primaryDecision: decisionState.primaryDecision,
    },
    projectionConfidence: projectionConfidenceForDay(ctx.baseFreshnessConfidence, dayOffset),
    assumptions: dayAssumptions,
  };
}

function buildProjectedDayContext(input: ProjectedAthleteInput): ProjectedDayBuildContext {
  const anchorTsb = Math.round((input.initialCtl - input.initialAtl) * 10) / 10;
  return {
    athleteId: input.athleteId,
    anchorTsb,
    initialAtl: input.initialAtl,
    initialCtl: input.initialCtl,
    anchorReadiness: input.recovery?.readinessScore ?? null,
    anchorFatigue: input.fatigue?.fatigueIndex ?? null,
    anchorAdaptation: input.adaptation?.adaptationIndex ?? null,
    recovery: input.recovery,
    fatigue: input.fatigue,
    adaptation: input.adaptation,
    physicalHealth: input.physicalHealth,
    environment: input.environment,
    plannedTssByDay: input.plannedTssByDay,
    environmentalImpactByDay: input.environmentalImpactByDay,
    plannedSessionCountByDay: input.plannedSessionCountByDay,
    baseFreshnessConfidence: input.baseFreshnessConfidence,
  };
}

export function projectAthleteState(input: ProjectedAthleteInput): ProjectedAthleteState | null {
  if (!input.recovery && !input.fatigue && !input.adaptation) {
    return null;
  }

  const { athleteId, anchorTrainingDayId, horizonDays, initialCtl, initialAtl } = input;

  const futureDayIds = buildFutureDayIds(anchorTrainingDayId, horizonDays);
  const dailyTss = futureDayIds.map((dayId) => input.plannedTssByDay.get(dayId) ?? 0);
  const pmcForward = projectPmcForward(initialCtl, initialAtl, dailyTss);
  const dayContext = buildProjectedDayContext(input);

  const days: ProjectedDayState[] = futureDayIds.map((trainingDayId, index) =>
    buildProjectedDayState(trainingDayId, index, pmcForward, dayContext),
  );

  const anchor = {
    readiness: dayContext.anchorReadiness,
    fatigueIndex: dayContext.anchorFatigue,
    adaptationIndex: dayContext.anchorAdaptation,
    ctl: initialCtl,
    atl: initialAtl,
    tsb: dayContext.anchorTsb,
  };

  return {
    modelId: PROJECTION_MODEL_ID,
    athleteId,
    anchorTrainingDayId,
    horizonDays,
    computedAt: new Date().toISOString(),
    anchor,
    days,
    summary: buildSummary(days, anchor),
    assumptions: GLOBAL_ASSUMPTIONS,
  };
}

export function limitingFactorLabel(
  limitingFactor: ProjectedDayState['decision']['limitingFactor'],
): string | null {
  const { description } = limitingFactor;
  if (!description) {
    return null;
  }
  return resolve(description);
}
