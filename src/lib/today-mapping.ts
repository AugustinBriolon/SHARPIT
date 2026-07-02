/**
 * Today Experience — display mapping functions.
 *
 * Pure functions: API types → UI display state.
 * No React dependency — testable in Vitest node environment.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Input types (mirroring API response shapes, no server imports on client)
// ─────────────────────────────────────────────────────────────────────────────

export type OverallVerdict =
  | 'TRAIN_HARD'
  | 'TRAIN_SMART'
  | 'TRAIN_EASY'
  | 'RECOVER'
  | 'RACE_READY'
  | 'CAUTION'
  | 'INSUFFICIENT_DATA';

export type ReadinessCategory =
  | 'OPTIMAL'
  | 'ADEQUATE'
  | 'REDUCED'
  | 'LOW'
  | 'VERY_LOW'
  | 'BASELINE_PENDING'
  | 'INSUFFICIENT_DATA';

export type FatigueLevel =
  | 'FRESH'
  | 'FUNCTIONAL_LOW'
  | 'FUNCTIONAL_HIGH'
  | 'ACCUMULATED'
  | 'NON_FUNCTIONAL_RISK'
  | 'OVERREACHING_RISK'
  | 'INSUFFICIENT_DATA';

export type FatigueTrajectory = 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';

export type AdaptationStatus =
  | 'POSITIVELY_ADAPTING'
  | 'MAINTAINING'
  | 'PLATEAUING'
  | 'MALADAPTING'
  | 'DETRAINING'
  | 'INSUFFICIENT_DATA';

export type AdaptationTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceTier = 'high' | 'medium' | 'low';

export type VerdictDisplay = {
  label: string;
  colorClass: string;
  bgClass: string;
  dotClass: string;
};

export type DimensionSignal = {
  label: string;
  arrow: string;
  arrowDirection: 'up' | 'neutral' | 'down';
  qualityClass: string;
  isAvailable: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Verdict display
// ─────────────────────────────────────────────────────────────────────────────

const VERDICT_DISPLAY: Record<OverallVerdict, VerdictDisplay> = {
  TRAIN_HARD: {
    label: 'Train Hard',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'from-emerald-500/10 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
  },
  RACE_READY: {
    label: 'Race Ready',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'from-emerald-500/10 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  TRAIN_SMART: {
    label: 'Train Smart',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'from-blue-500/10 border-blue-500/30',
    dotClass: 'bg-blue-500',
  },
  TRAIN_EASY: {
    label: 'Train Easy',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'from-amber-500/10 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  CAUTION: {
    label: 'Caution',
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'from-orange-500/10 border-orange-500/30',
    dotClass: 'bg-orange-500',
  },
  RECOVER: {
    label: 'Recover',
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'from-red-500/10 border-red-500/30',
    dotClass: 'bg-red-500',
  },
  INSUFFICIENT_DATA: {
    label: 'Insufficient Data',
    colorClass: 'text-muted-foreground',
    bgClass: 'from-muted/30 border-border',
    dotClass: 'bg-muted-foreground',
  },
};

export function mapVerdictToDisplay(verdict: OverallVerdict): VerdictDisplay {
  return VERDICT_DISPLAY[verdict];
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence tier
// ─────────────────────────────────────────────────────────────────────────────

export function mapConfidenceToTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery dimension signal
// ─────────────────────────────────────────────────────────────────────────────

export function mapRecoveryToSignal(category: ReadinessCategory): DimensionSignal {
  switch (category) {
    case 'OPTIMAL':
      return {
        label: 'Excellent',
        arrow: '↗',
        arrowDirection: 'up',
        qualityClass: 'text-emerald-600 dark:text-emerald-400',
        isAvailable: true,
      };
    case 'ADEQUATE':
      return {
        label: 'Adequate',
        arrow: '→',
        arrowDirection: 'neutral',
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'REDUCED':
      return {
        label: 'Restoring',
        arrow: '↗',
        arrowDirection: 'up',
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'LOW':
      return {
        label: 'Reduced',
        arrow: '↘',
        arrowDirection: 'down',
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'VERY_LOW':
      return {
        label: 'Depleted',
        arrow: '↘',
        arrowDirection: 'down',
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'BASELINE_PENDING':
      return {
        label: 'Building model',
        arrow: '…',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'No data',
        arrow: '—',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue dimension signal
// ─────────────────────────────────────────────────────────────────────────────

export function mapFatigueTrajectoryToArrow(trajectory: FatigueTrajectory): {
  arrow: string;
  direction: 'up' | 'neutral' | 'down';
} {
  switch (trajectory) {
    case 'RESOLVING':
      return { arrow: '↘', direction: 'down' };
    case 'STABLE':
      return { arrow: '→', direction: 'neutral' };
    case 'ACCUMULATING':
      return { arrow: '↗', direction: 'up' };
    case 'ACCELERATING':
      return { arrow: '↑↑', direction: 'up' };
  }
}

export function mapFatigueToSignal(
  level: FatigueLevel,
  trajectory: FatigueTrajectory,
): DimensionSignal {
  const traj = mapFatigueTrajectoryToArrow(trajectory);

  switch (level) {
    case 'FRESH':
      return {
        label: 'Fresh',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-emerald-600 dark:text-emerald-400',
        isAvailable: true,
      };
    case 'FUNCTIONAL_LOW':
      return {
        label: 'Functional',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'FUNCTIONAL_HIGH':
      return {
        label: 'Functional',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'ACCUMULATED':
      return {
        label: 'Building',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'NON_FUNCTIONAL_RISK':
      return {
        label: 'Accumulated',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'OVERREACHING_RISK':
      return {
        label: 'Critical',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-700 dark:text-red-300',
        isAvailable: true,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'No data',
        arrow: '—',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptation dimension signal
// ─────────────────────────────────────────────────────────────────────────────

export function mapAdaptationToSignal(
  status: AdaptationStatus,
  trend: AdaptationTrend,
): DimensionSignal {
  const arrowMap: Record<AdaptationTrend, { arrow: string; direction: 'up' | 'neutral' | 'down' }> =
    {
      IMPROVING: { arrow: '↗', direction: 'up' },
      STABLE: { arrow: '→', direction: 'neutral' },
      DECLINING: { arrow: '↘', direction: 'down' },
    };

  const traj = arrowMap[trend];

  switch (status) {
    case 'POSITIVELY_ADAPTING':
      return {
        label: 'Growing',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-emerald-600 dark:text-emerald-400',
        isAvailable: true,
      };
    case 'MAINTAINING':
      return {
        label: 'Maintaining',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'PLATEAUING':
      return {
        label: 'Plateauing',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'MALADAPTING':
      return {
        label: 'Maladapting',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'DETRAINING':
      return {
        label: 'Detraining',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'No data',
        arrow: '—',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary insight extraction
// Spec: "one-sentence summary generated from primaryInsight"
// The API surfaces this via topAction.rationale or first keyFinding title.
// ─────────────────────────────────────────────────────────────────────────────

export function extractPrimaryInsight(
  topActionRationale: string | null | undefined,
  firstFindingTitle: string | null | undefined,
  explanation: string | null | undefined,
): string | null {
  if (topActionRationale) return topActionRationale;
  if (firstFindingTitle) return firstFindingTitle;
  if (explanation) {
    const [firstSentence] = explanation.split(/[.!?]/);
    return firstSentence ? firstSentence.trim() : null;
  }
  return null;
}
