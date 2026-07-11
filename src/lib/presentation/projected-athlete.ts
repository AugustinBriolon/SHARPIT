/**
 * Projected Athlete State — presentation mapping.
 */

import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import type { ProjectionHorizonDays, ProjectedAthleteState } from '@/core/projection/types';
import { buildProjectedAthleteInput } from '@/lib/projection/build-projection-input';
import { limitingFactorLabel, projectAthleteState } from '@/lib/projection/project-athlete-state';
import { localDateLabel } from '@/lib/projection/build-projection-input';
import { mapVerdictToDisplay } from '@/lib/today-mapping';

const HORIZON_OPTIONS: ProjectionHorizonDays[] = [1, 3, 7, 14];

function confidenceLabel(confidence: number): string | null {
  if (confidence >= 0.75) return 'Confiance élevée';
  if (confidence >= 0.55) return 'Confiance modérée';
  if (confidence > 0) return 'Confiance partielle';
  return null;
}

function formatScore(value: number | null): string | null {
  if (value == null) return null;
  return String(Math.round(value));
}

function adaptationStatusLabel(
  status: ProjectedAthleteState['days'][number]['physiology']['adaptationStatus'],
): string | null {
  if (!status || status === 'INSUFFICIENT_DATA') return null;
  const labels: Record<string, string> = {
    POSITIVELY_ADAPTING: 'Adaptation positive',
    MAINTAINING: 'Maintien',
    PLATEAUING: 'Plateau',
    MALADAPTING: 'Mal-adaptation',
    DETRAINING: 'Désentraînement',
  };
  return labels[status] ?? status;
}

function environmentalLabel(
  impact: ProjectedAthleteState['days'][number]['environment']['trainingImpact'],
): string {
  if (impact === 'SIGNIFICANT') return 'Contrainte significative';
  if (impact === 'MODERATE') return 'Contrainte modérée';
  return 'Aucune contrainte majeure';
}

function limitingFactorDomainLabel(domain: string | null): string | null {
  if (!domain) return null;
  const labels: Record<string, string> = {
    RECOVERY: 'Récupération',
    FATIGUE: 'Fatigue',
    ADAPTATION: 'Adaptation',
    PHYSICAL_HEALTH: 'Santé physique',
    ENVIRONMENT: 'Environnement',
    PLANNING: 'Planification',
  };
  return labels[domain] ?? domain;
}

export function buildProjectedAthleteViewModel(
  state: ProjectedAthleteState | null,
  horizonDays: ProjectionHorizonDays,
): ProjectedAthleteCardViewModel {
  if (!state || state.days.length === 0) {
    return {
      visible: false,
      horizonDays,
      headline: 'Projection indisponible',
      planningConfidenceLabel: null,
      metrics: [],
      riskLines: [],
      horizonDaysPreview: [],
      peakReadinessLabel: null,
      highestRiskLabel: null,
      mainLimitingFactorLabel: null,
      assumptions: [],
      emptyStateMessage:
        'Ajoute des séances planifiées et assure-toi d’avoir un état athlète à jour pour voir la projection.',
    };
  }

  const endDay = state.days[state.days.length - 1];
  const metrics = [
    {
      label: 'Readiness attendue',
      value: formatScore(endDay.physiology.expectedReadiness) ?? '—',
      detail: endDay.dateLabel,
    },
    {
      label: 'Fatigue attendue',
      value: formatScore(endDay.physiology.expectedFatigueIndex) ?? '—',
      detail: endDay.physiology.fatigueLevel ?? null,
    },
    {
      label: 'Adaptation attendue',
      value: formatScore(endDay.physiology.expectedAdaptationIndex) ?? '—',
      detail: adaptationStatusLabel(endDay.physiology.adaptationStatus),
    },
    {
      label: 'Contraintes environnementales',
      value: environmentalLabel(endDay.environment.trainingImpact),
      detail:
        endDay.environment.sessionCount > 0
          ? `${endDay.environment.sessionCount} séance(s) planifiée(s)`
          : null,
    },
    {
      label: 'Facteur limitant futur',
      value:
        limitingFactorLabel(endDay.decision.limitingFactor) ??
        limitingFactorDomainLabel(
          endDay.decision.limitingFactor.domain ?? endDay.decision.limitingFactor.system,
        ) ??
        '—',
      detail: mapVerdictToDisplay(endDay.decision.overallVerdict).label,
    },
    {
      label: 'Confiance planification',
      value: confidenceLabel(state.summary.planningConfidence) ?? '—',
      detail: `${Math.round(state.summary.planningConfidence * 100)} %`,
    },
  ] as const;

  const horizonDaysPreview = state.days.map((day) => ({
    trainingDayId: day.trainingDayId,
    dateLabel: day.dateLabel,
    readiness: formatScore(day.physiology.expectedReadiness),
    fatigue: formatScore(day.physiology.expectedFatigueIndex),
    adaptation: formatScore(day.physiology.expectedAdaptationIndex),
    verdictLabel: mapVerdictToDisplay(day.decision.overallVerdict).label,
    limitingFactor: limitingFactorLabel(day.decision.limitingFactor),
    projectionConfidenceLabel: confidenceLabel(day.projectionConfidence),
    isPeakReadiness: day.trainingDayId === state.summary.peakReadinessDay,
    isHighestRisk: day.trainingDayId === state.summary.highestRiskDay,
  }));

  return {
    visible: true,
    horizonDays,
    headline: state.summary.headline,
    planningConfidenceLabel: confidenceLabel(state.summary.planningConfidence),
    metrics,
    riskLines: state.summary.riskLines,
    horizonDaysPreview,
    peakReadinessLabel: state.summary.peakReadinessDay
      ? localDateLabel(state.summary.peakReadinessDay)
      : null,
    highestRiskLabel: state.summary.highestRiskDay
      ? localDateLabel(state.summary.highestRiskDay)
      : null,
    mainLimitingFactorLabel: limitingFactorDomainLabel(state.summary.mainLimitingFactor),
    assumptions: state.assumptions.map((a) => a.label),
    emptyStateMessage: null,
  };
}

export async function buildProjectedAthletePresentationViewModel(params?: {
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
}): Promise<ProjectedAthleteCardViewModel> {
  const horizonDays = params?.horizonDays ?? 7;
  if (!HORIZON_OPTIONS.includes(horizonDays)) {
    return buildProjectedAthleteViewModel(null, 7);
  }

  const input = await buildProjectedAthleteInput({
    horizonDays,
    anchorTrainingDayId: params?.anchorTrainingDayId,
  });
  if (!input) {
    return buildProjectedAthleteViewModel(null, horizonDays);
  }

  const state = projectAthleteState(input);
  return buildProjectedAthleteViewModel(state, horizonDays);
}

export { HORIZON_OPTIONS };
