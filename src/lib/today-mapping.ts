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

// ─────────────────────────────────────────────────────────────────────────────
// Decision verdict types (mirroring API shapes, duplicated here to keep
// this module free of cross-file imports)
// ─────────────────────────────────────────────────────────────────────────────

export type OverreachingRisk = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type TrainingCapacity = 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';

export type RecommendedIntensity = 'REST' | 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD';

export type RecoveryDecisionVerdict =
  'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FATIGUED' | 'OVERREACHED' | 'INSUFFICIENT_DATA';

export type FatigueDecisionVerdict =
  'BUILD' | 'MAINTAIN' | 'REDUCE' | 'REST_WEEK' | 'TAPER' | 'INSUFFICIENT_DATA';

// ─────────────────────────────────────────────────────────────────────────────
// Adaptation decision → training objective label (Q3)
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationDecisionVerdict =
  | 'INCREASE_LOAD'
  | 'SUSTAIN'
  | 'CONSOLIDATE'
  | 'REDUCE_LOAD'
  | 'RECOVERY_PRIORITY'
  | 'INSUFFICIENT_DATA';

const ADAPTATION_OBJECTIVE: Record<AdaptationDecisionVerdict, string | null> = {
  INCREASE_LOAD: 'Build fitness',
  SUSTAIN: 'Maintain gains',
  CONSOLIDATE: 'Reinforce adaptations',
  REDUCE_LOAD: 'Absorb training stress',
  RECOVERY_PRIORITY: 'Active recovery',
  INSUFFICIENT_DATA: null,
};

export function mapAdaptationDecisionToObjective(
  verdict: AdaptationDecisionVerdict,
): string | null {
  return ADAPTATION_OBJECTIVE[verdict];
}

// ─────────────────────────────────────────────────────────────────────────────
// Deviation risk assessment (Q6)
// Takes the worst risk across recovery + fatigue dimensions and trajectory.
// ─────────────────────────────────────────────────────────────────────────────

export type DeviationRiskLevel = 'safe' | 'caution' | 'warning';

const RISK_RANK: Record<string, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function mapDeviationRisk(
  overreachingRisk: string,
  functionalOverreachingRisk: string,
  fatigueTrajectory: FatigueTrajectory,
): { level: DeviationRiskLevel; message: string } {
  const worst = Math.max(
    RISK_RANK[overreachingRisk] ?? 0,
    RISK_RANK[functionalOverreachingRisk] ?? 0,
  );
  const accumulating = fatigueTrajectory === 'ACCUMULATING' || fatigueTrajectory === 'ACCELERATING';

  if (worst >= 3 || (worst >= 2 && accumulating)) {
    return {
      level: 'warning',
      message: 'Going harder risks overreaching — fatigue is already accumulating.',
    };
  }
  if (worst >= 2 || (worst >= 1 && accumulating)) {
    return {
      level: 'caution',
      message: 'Pushing beyond the prescription could delay recovery.',
    };
  }
  return { level: 'safe', message: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Physiological consistency display (Q8)
// ─────────────────────────────────────────────────────────────────────────────

export type PhysiologicalConsistency =
  'ALIGNED' | 'PARTIALLY_ALIGNED' | 'CONFLICTING' | 'INSUFFICIENT_DATA';

export function mapConsistencyToDisplay(
  consistency: PhysiologicalConsistency,
  score: number,
): { label: string; colorClass: string } {
  switch (consistency) {
    case 'ALIGNED':
      return {
        label: `Systems aligned (${score}/100)`,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'PARTIALLY_ALIGNED':
      return {
        label: `Partially aligned (${score}/100)`,
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'CONFLICTING':
      return {
        label: `Systems conflicting (${score}/100)`,
        colorClass: 'text-orange-600 dark:text-orange-400',
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Not enough data to assess',
        colorClass: 'text-muted-foreground',
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

// ─────────────────────────────────────────────────────────────────────────────
// Expected outcome projections — what happens if the athlete follows the plan
// ─────────────────────────────────────────────────────────────────────────────

export function mapRecoveryProjection(
  verdict: RecoveryDecisionVerdict,
  overreachingRisk: OverreachingRisk,
): string {
  if (verdict === 'OVERREACHED')
    return 'Physiological recovery requires 2–3 days — rest is the fastest path forward.';
  if (verdict === 'FATIGUED') return 'Active recovery today accelerates readiness for tomorrow.';
  if (verdict === 'PARTIALLY_RECOVERED') {
    if (overreachingRisk === 'HIGH' || overreachingRisk === 'CRITICAL') {
      return 'Recovery will improve if load is kept in check today.';
    }
    return 'Readiness will recover fully within 24–48 hours.';
  }
  if (verdict === 'RECOVERED') {
    if (overreachingRisk === 'LOW') return 'Full recovery expected to hold through tomorrow.';
    return 'Recovery is sufficient — manage session intensity to stay there.';
  }
  return '';
}

export function mapFatigueProjection(
  verdict: FatigueDecisionVerdict,
  trajectory: FatigueTrajectory,
  capacity: TrainingCapacity,
): string {
  if (verdict === 'REST_WEEK' || verdict === 'TAPER') {
    return 'Rest allows accumulated fatigue to fully clear.';
  }
  if (verdict === 'REDUCE') {
    if (trajectory === 'ACCELERATING')
      return 'Load reduction now prevents non-functional overreaching.';
    return 'Backing off today stops fatigue from compounding.';
  }
  if (verdict === 'MAINTAIN') return 'Fatigue will remain in the functional range.';
  if (verdict === 'BUILD') {
    if (trajectory === 'RESOLVING')
      return 'Fatigue is resolving — a well-dosed session now maximises adaptation.';
    if (capacity === 'FULL') return 'Fatigue is manageable — full training capacity available.';
    return 'Manageable fatigue — training capacity within normal range.';
  }
  return '';
}

export function mapAdaptationProjection(
  verdict: AdaptationDecisionVerdict,
  loadMultiplier: number,
): string {
  if (verdict === 'RECOVERY_PRIORITY')
    return 'Recovery investment protects your long-term fitness base.';
  if (verdict === 'REDUCE_LOAD') return 'Reducing load now allows recent adaptations to take root.';
  if (verdict === 'CONSOLIDATE')
    return 'Consistent load consolidates the adaptations from recent weeks.';
  if (verdict === 'SUSTAIN') return 'Current training load sustains your fitness gains.';
  if (verdict === 'INCREASE_LOAD') {
    if (loadMultiplier > 1.1)
      return 'A quality training stimulus today drives measurable fitness gains in 10–14 days.';
    return 'Progressive overload will compound into fitness gains over the coming weeks.';
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable intensity and capacity labels
// ─────────────────────────────────────────────────────────────────────────────

const INTENSITY_LABEL: Record<RecommendedIntensity, string> = {
  REST: 'Full rest',
  VERY_EASY: 'Very easy movement',
  EASY: 'Easy effort',
  MODERATE: 'Moderate effort',
  HARD: 'High intensity',
};

export function mapRecoveryIntensityLabel(intensity: RecommendedIntensity): string {
  return INTENSITY_LABEL[intensity];
}

const CAPACITY_LABEL: Record<TrainingCapacity, string> = {
  FULL: 'Full training capacity',
  REDUCED: 'Reduced capacity',
  LIGHT_ONLY: 'Light activity only',
  REST_ONLY: 'Rest only',
};

export function mapFatigueCapacityLabel(capacity: TrainingCapacity): string {
  return CAPACITY_LABEL[capacity];
}
