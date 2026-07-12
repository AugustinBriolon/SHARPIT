/**
 * Projected Athlete State — presentation mapping.
 */

import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import type { ProjectionHorizonDays, ProjectedAthleteState } from '@/core/projection/types';
import { buildProjectedAthleteInput } from '@/lib/projection/build-projection-input';
import { projectAthleteState } from '@/lib/projection/project-athlete-state';
import { localDateLabel } from '@/lib/projection/build-projection-input';

const HORIZON_OPTIONS: ProjectionHorizonDays[] = [1, 3, 7, 14];

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

function buildProjectionSynthesis(state: ProjectedAthleteState): string {
  const { summary, days } = state;
  const confidencePct = Math.round(summary.planningConfidence * 100);
  const tsbEnd = days[days.length - 1]?.load.tsb ?? state.anchor.tsb;

  let opener: string;
  if (tsbEnd >= 5) opener = 'Ta forme devrait remonter';
  else if (tsbEnd <= -15) opener = "La fatigue risque de s'accumuler";
  else opener = 'La charge devrait rester équilibrée';

  if (summary.peakReadinessDay) {
    opener += ` d'ici ${localDateLabel(summary.peakReadinessDay)}`;
  }

  let sentence = opener;

  if (summary.highestRiskDay) {
    const riskDay = days.find((d) => d.trainingDayId === summary.highestRiskDay);
    const domain = limitingFactorDomainLabel(
      riskDay?.decision.limitingFactor.domain ?? summary.mainLimitingFactor,
    );
    const vigilance = domain?.toLowerCase() ?? 'récupération';
    sentence += `, mais ${localDateLabel(summary.highestRiskDay)} est un point de vigilance côté ${vigilance}`;
  }

  const confidenceTail = (() => {
    if (confidencePct >= 75) return 'le plan paraît fiable';
    if (confidencePct >= 55) return 'le plan reste modérément fiable';
    return `le plan reste incertain à ${confidencePct} %`;
  })();

  return `${sentence} — ${confidenceTail}.`;
}

export function buildProjectedAthleteViewModel(
  state: ProjectedAthleteState | null,
  horizonDays: ProjectionHorizonDays,
): ProjectedAthleteCardViewModel {
  if (!state || state.days.length === 0) {
    return {
      visible: false,
      horizonDays,
      synthesisSentence: 'Projection indisponible.',
      highestRiskTrainingDayId: null,
      emptyStateMessage:
        'Ajoute des séances planifiées et assure-toi d’avoir un état athlète à jour pour voir la projection.',
    };
  }

  return {
    visible: true,
    horizonDays,
    synthesisSentence: buildProjectionSynthesis(state),
    highestRiskTrainingDayId: state.summary.highestRiskDay,
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
