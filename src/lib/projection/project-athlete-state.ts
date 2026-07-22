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

  const withReadiness = days.filter((d) => d.physiology.expectedReadiness != null);
  const peakDay =
    withReadiness.length > 0
      ? withReadiness.reduce((best, day) =>
          (day.physiology.expectedReadiness ?? 0) > (best.physiology.expectedReadiness ?? 0)
            ? day
            : best,
        ).trainingDayId
      : null;

  const riskVerdicts = new Set(['RECOVER', 'CAUTION', 'INSUFFICIENT_DATA']);
  const riskDays = days.filter((d) => riskVerdicts.has(d.decision.overallVerdict));
  const highestRiskDay =
    riskDays.length > 0
      ? riskDays.reduce((worst, day) =>
          (day.physiology.expectedReadiness ?? 100) < (worst.physiology.expectedReadiness ?? 100)
            ? day
            : worst,
        ).trainingDayId
      : null;

  const factorCounts = new Map<string, number>();
  for (const day of days) {
    const domain = day.decision.limitingFactor.domain ?? day.decision.limitingFactor.system;
    if (domain) factorCounts.set(domain, (factorCounts.get(domain) ?? 0) + 1);
  }
  const mainLimitingFactor =
    [...factorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const planningConfidence =
    Math.round((days.reduce((sum, d) => sum + d.projectionConfidence, 0) / days.length) * 100) /
    100;

  const tsbEnd = days[days.length - 1]?.load.tsb ?? anchor.tsb;
  const headline = projectionHeadlineFromTsb(tsbEnd);

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

  return {
    peakReadinessDay: peakDay,
    highestRiskDay,
    mainLimitingFactor,
    planningConfidence,
    headline,
    riskLines: riskLines.slice(0, 3),
  };
}

export function projectAthleteState(input: ProjectedAthleteInput): ProjectedAthleteState | null {
  const {
    athleteId,
    anchorTrainingDayId,
    horizonDays,
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    initialCtl,
    initialAtl,
    plannedTssByDay,
    environmentalImpactByDay,
    plannedSessionCountByDay,
    baseFreshnessConfidence,
  } = input;

  if (!recovery && !fatigue && !adaptation) {
    return null;
  }

  const futureDayIds = buildFutureDayIds(anchorTrainingDayId, horizonDays);
  const dailyTss = futureDayIds.map((dayId) => plannedTssByDay.get(dayId) ?? 0);
  const pmcForward = projectPmcForward(initialCtl, initialAtl, dailyTss);

  const anchorTsb = Math.round((initialCtl - initialAtl) * 10) / 10;
  const anchorReadiness = recovery?.readinessScore ?? null;
  const anchorFatigue = fatigue?.fatigueIndex ?? null;
  const anchorAdaptation = adaptation?.adaptationIndex ?? null;

  const days: ProjectedDayState[] = futureDayIds.map((trainingDayId, index) => {
    const dayOffset = index + 1;
    const load = pmcForward[index];
    const tsbDelta = load.tsb - anchorTsb;
    const atlDelta = load.atl - initialAtl;
    const ctlDelta = load.ctl - initialCtl;

    const expectedReadiness = projectReadinessScore(anchorReadiness, tsbDelta);
    const expectedFatigueIndex = projectFatigueIndex(anchorFatigue, atlDelta);
    const expectedAdaptationIndex = projectAdaptationIndex(anchorAdaptation, ctlDelta);

    const projectedRecovery =
      recovery != null
        ? synthesizeProjectedRecovery(recovery, expectedReadiness, trainingDayId)
        : null;
    const projectedFatigue =
      fatigue != null
        ? synthesizeProjectedFatigue(fatigue, expectedFatigueIndex, trainingDayId, load.tsb)
        : null;
    const projectedAdaptation =
      adaptation != null
        ? synthesizeProjectedAdaptation(adaptation, expectedAdaptationIndex, trainingDayId)
        : null;

    const envImpact = environmentalImpactByDay.get(trainingDayId) ?? 'NONE';
    const sessionCount = plannedSessionCountByDay.get(trainingDayId) ?? 0;

    const { decisionState } = runProjectedDecision({
      trainingDayId,
      athleteId,
      recovery: projectedRecovery,
      fatigue: projectedFatigue,
      adaptation: projectedAdaptation,
      physicalHealth,
      environment,
      dayOffset,
      baseFreshnessConfidence,
    });

    const projectionConfidence = projectionConfidenceForDay(baseFreshnessConfidence, dayOffset);

    const dayAssumptions: ProjectionAssumption[] = [];
    if ((plannedTssByDay.get(trainingDayId) ?? 0) === 0) {
      dayAssumptions.push({
        code: 'rest-day',
        label: 'Jour sans séance planifiée — charge TSS = 0.',
      });
    }

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
      physiology: {
        expectedReadiness,
        expectedFatigueIndex,
        expectedAdaptationIndex,
        readinessCategory: projectedRecovery?.readinessCategory ?? null,
        fatigueLevel: projectedFatigue?.fatigueLevel ?? null,
        adaptationStatus: projectedAdaptation?.adaptationStatus ?? null,
      },
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
      projectionConfidence,
      assumptions: dayAssumptions,
    };
  });

  const summary = buildSummary(days, {
    readiness: anchorReadiness,
    fatigueIndex: anchorFatigue,
    adaptationIndex: anchorAdaptation,
    ctl: initialCtl,
    atl: initialAtl,
    tsb: anchorTsb,
  });

  return {
    modelId: PROJECTION_MODEL_ID,
    athleteId,
    anchorTrainingDayId,
    horizonDays,
    computedAt: new Date().toISOString(),
    anchor: {
      readiness: anchorReadiness,
      fatigueIndex: anchorFatigue,
      adaptationIndex: anchorAdaptation,
      ctl: initialCtl,
      atl: initialAtl,
      tsb: anchorTsb,
    },
    days,
    summary,
    assumptions: GLOBAL_ASSUMPTIONS,
  };
}

export function limitingFactorLabel(
  limitingFactor: ProjectedDayState['decision']['limitingFactor'],
): string | null {
  const { description } = limitingFactor;
  if (!description) return null;
  return resolve(description);
}
