/**
 * Projected Athlete State — presentation mapping.
 */

import type { RecoveryState } from '@/core/digital-twin/types';
import type {
  ProjectedAthleteCardViewModel,
  ProjectedAthleteCaution,
} from '@/core/presentation/projected-athlete-view-model';
import type { ProjectionHorizonDays, ProjectedAthleteState } from '@/core/projection/types';
import {
  buildProjectedAthleteInput,
  localDateLabel,
} from '@/lib/projection/build-projection-input';
import { projectAthleteState } from '@/lib/projection/project-athlete-state';

const HORIZON_OPTIONS: ProjectionHorizonDays[] = [1, 3, 7, 14];

type RecoveryLimiter = NonNullable<RecoveryState['primaryLimitingFactor']>;

const RECOVERY_CAUTION: Record<RecoveryLimiter, ProjectedAthleteCaution> = {
  sleep: {
    label: 'Vigilance — sommeil',
    body: 'Le sommeil freine ta récupération aujourd’hui : la projection du plan en hérite. Garde une marge sur les séances exigeantes et priorise le coucher — la lecture redevient plus nette quand le sommeil se rétablit.',
  },
  autonomic: {
    label: 'Vigilance — système nerveux',
    body: 'Ton tonus autonome tire la lecture vers le bas : la projection du plan en hérite. Garde une marge sur l’intensité et écoute les signaux (fatigue, humeur) pendant les séances.',
  },
  subjective: {
    label: 'Vigilance — ressenti',
    body: 'Ton ressenti tire la lecture vers le bas : la projection du plan en hérite. Reste prudent sur les efforts durs et ajuste si le corps ne suit pas le plan.',
  },
  loadContext: {
    label: 'Vigilance — charge',
    body: 'Le contexte de charge freine ta récupération : la projection du plan en hérite. Évite d’empiler trop d’intensité — laisse de la marge sur les séances clés.',
  },
};

const DOMAIN_CAUTION: Record<string, ProjectedAthleteCaution> = {
  RECOVERY: {
    label: 'Vigilance — récupération',
    body: 'La récupération reste le frein principal : la projection du plan en hérite. Garde une marge sur les séances exigeantes jusqu’à ce que les signaux se stabilisent.',
  },
  FATIGUE: {
    label: 'Vigilance — fatigue',
    body: 'La fatigue reste le frein principal : la projection du plan en hérite. Surveille l’accumulation et garde une marge sur les efforts durs.',
  },
  ADAPTATION: {
    label: 'Vigilance — adaptation',
    body: 'L’adaptation reste le frein principal : la projection du plan en hérite. Privilégie la qualité d’exécution plutôt que d’ajouter de la charge.',
  },
  PHYSICAL_HEALTH: {
    label: 'Vigilance — santé physique',
    body: 'La santé physique reste le frein principal : la projection du plan en hérite. Adapte l’intensité et n’ignore pas les signaux corporels.',
  },
  ENVIRONMENT: {
    label: 'Vigilance — environnement',
    body: 'L’environnement reste une contrainte : la projection du plan en hérite. Anticipe chaleur, vent ou altitude sur les séances exposées.',
  },
  PLANNING: {
    label: 'Vigilance — planification',
    body: 'Le plan lui-même porte une incertitude : la projection en hérite. Traite cette lecture comme indicative et ajuste séance par séance.',
  },
};

function limitingFactorDomainLabel(domain: string | null): string | null {
  if (!domain) return null;
  const labels: Record<string, string> = {
    RECOVERY: 'récupération',
    FATIGUE: 'fatigue',
    ADAPTATION: 'adaptation',
    PHYSICAL_HEALTH: 'santé physique',
    ENVIRONMENT: 'environnement',
    PLANNING: 'planification',
  };
  return labels[domain] ?? domain.toLowerCase();
}

/** Trajectory sentence only — no confidence percentage. */
export function buildProjectionTrajectory(state: ProjectedAthleteState): string {
  const { summary, days } = state;
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
    const vigilance = domain ?? 'récupération';
    sentence += `, mais ${localDateLabel(summary.highestRiskDay)} est un point de vigilance côté ${vigilance}`;
  }

  return `${sentence}.`;
}

/**
 * Named caution from anchor recovery limiter, else projected domain frein.
 * Returns null when no clear doubt source — avoid inventing uncertainty.
 */
export function buildProjectionCaution(
  state: ProjectedAthleteState,
  recovery: RecoveryState | null | undefined,
): ProjectedAthleteCaution | null {
  const limiter = recovery?.primaryLimitingFactor ?? null;
  if (limiter && RECOVERY_CAUTION[limiter]) {
    return RECOVERY_CAUTION[limiter];
  }

  const riskDay = state.summary.highestRiskDay
    ? state.days.find((d) => d.trainingDayId === state.summary.highestRiskDay)
    : undefined;
  const domain = riskDay?.decision.limitingFactor.domain ?? state.summary.mainLimitingFactor;
  if (domain && DOMAIN_CAUTION[domain]) {
    return DOMAIN_CAUTION[domain];
  }

  return null;
}

export function buildProjectedAthleteViewModel(
  state: ProjectedAthleteState | null,
  horizonDays: ProjectionHorizonDays,
  recovery?: RecoveryState | null,
): ProjectedAthleteCardViewModel {
  if (!state || state.days.length === 0) {
    return {
      visible: false,
      horizonDays,
      synthesisSentence: 'Projection indisponible.',
      caution: null,
      highestRiskTrainingDayId: null,
      emptyStateMessage:
        'Ajoute des séances planifiées et assure-toi d’avoir un état athlète à jour pour voir la projection.',
    };
  }

  return {
    visible: true,
    horizonDays,
    synthesisSentence: buildProjectionTrajectory(state),
    caution: buildProjectionCaution(state, recovery),
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
  return buildProjectedAthleteViewModel(state, horizonDays, input.recovery);
}

export { HORIZON_OPTIONS };
