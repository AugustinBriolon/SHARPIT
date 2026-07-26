import type { DailyStrainData } from '@/hooks/use-today';

export type EffortStrainContributorKey = 'training' | 'cardiovascular' | 'movement';

export type EffortStrainContributorView = {
  readonly key: EffortStrainContributorKey;
  readonly label: string;
  readonly description: string;
  readonly available: boolean;
  readonly load: number | null;
  readonly score: number | null;
  readonly signalSummary: string | null;
};

export type EffortStrainCompositionView = {
  readonly available: boolean;
  readonly dominantKey: EffortStrainContributorKey | null;
  readonly contributors: readonly EffortStrainContributorView[];
};

const CONTRIBUTOR_META: Record<
  EffortStrainContributorKey,
  { label: string; emptyDescription: string }
> = {
  training: {
    label: 'Entraînement',
    emptyDescription: 'Aucune séance structurée aujourd’hui',
  },
  cardiovascular: {
    label: 'Cardiovasculaire',
    emptyDescription: 'Stress et Body Battery non disponibles',
  },
  movement: {
    label: 'Mouvement',
    emptyDescription: 'Pas quotidiens non disponibles',
  },
};

function formatSteps(steps: number): string {
  return `${steps.toLocaleString('fr-FR')} pas`;
}

function buildCardiovascularSummary(strain: DailyStrainData): string | null {
  const { stress, bodyBattery, recoveryScore } = strain.trace.cardiovascularSignals;
  const parts: string[] = [];
  if (stress != null) parts.push(`stress ${Math.round(stress)}`);
  if (bodyBattery != null) parts.push(`Body Battery ${Math.round(bodyBattery)}`);
  if (recoveryScore != null && stress == null && bodyBattery == null) {
    parts.push(`readiness Garmin ${Math.round(recoveryScore)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildMovementSummary(strain: DailyStrainData): string | null {
  const steps = strain.trace.movementSignals?.totalSteps;
  if (steps != null && steps > 0) return formatSteps(steps);
  return null;
}

function toContributor(
  key: EffortStrainContributorKey,
  contribution: DailyStrainData['contributions'][EffortStrainContributorKey],
  signalSummary: string | null,
): EffortStrainContributorView {
  const meta = CONTRIBUTOR_META[key];
  if (!contribution.available || contribution.load == null) {
    return {
      key,
      label: meta.label,
      description: meta.emptyDescription,
      available: false,
      load: null,
      score: null,
      signalSummary: null,
    };
  }

  return {
    key,
    label: meta.label,
    description: signalSummary ?? meta.emptyDescription,
    available: true,
    load: contribution.load,
    score: contribution.score,
    signalSummary,
  };
}

function mapDominantKey(
  dominant: DailyStrainData['dominantContributor'],
): EffortStrainContributorKey | null {
  if (dominant === 'TRAINING') return 'training';
  if (dominant === 'CARDIOVASCULAR') return 'cardiovascular';
  if (dominant === 'MOVEMENT') return 'movement';
  return null;
}

/**
 * Pure presentation mapper — no physiological inference.
 * Turns daily-strain contributions into athlete-facing composition rows.
 */
export function buildEffortStrainComposition(
  dailyStrain: DailyStrainData | null | undefined,
): EffortStrainCompositionView {
  if (!dailyStrain?.available) {
    return {
      available: false,
      dominantKey: null,
      contributors: [
        toContributor('training', emptyContribution(), null),
        toContributor('cardiovascular', emptyContribution(), null),
        toContributor('movement', emptyContribution(), null),
      ],
    };
  }

  return {
    available: true,
    dominantKey: mapDominantKey(dailyStrain.dominantContributor),
    contributors: [
      toContributor('training', dailyStrain.contributions.training, null),
      toContributor(
        'cardiovascular',
        dailyStrain.contributions.cardiovascular,
        buildCardiovascularSummary(dailyStrain),
      ),
      toContributor(
        'movement',
        dailyStrain.contributions.movement,
        buildMovementSummary(dailyStrain),
      ),
    ],
  };
}

function emptyContribution(): DailyStrainData['contributions']['training'] {
  return {
    available: false,
    contributor: 'TRAINING',
    load: null,
    score: null,
    confidence: 0,
    source: 'UNKNOWN',
  };
}
