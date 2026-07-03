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
  accentBarClass: string;
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
    label: 'Entraîne-toi fort',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'from-emerald-500/12 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    accentBarClass: 'bg-emerald-500/80',
  },
  RACE_READY: {
    label: 'Prêt à courir',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'from-emerald-500/12 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    accentBarClass: 'bg-emerald-400/80',
  },
  TRAIN_SMART: {
    label: 'Entraîne-toi finement',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'from-blue-500/12 border-blue-500/30',
    dotClass: 'bg-blue-500',
    accentBarClass: 'bg-blue-500/80',
  },
  TRAIN_EASY: {
    label: 'Entraîne-toi légèrement',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'from-amber-500/12 border-amber-500/30',
    dotClass: 'bg-amber-500',
    accentBarClass: 'bg-amber-500/80',
  },
  CAUTION: {
    label: 'Prudence',
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'from-orange-500/12 border-orange-500/30',
    dotClass: 'bg-orange-500',
    accentBarClass: 'bg-orange-500/80',
  },
  RECOVER: {
    label: 'Récupère',
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'from-red-500/12 border-red-500/30',
    dotClass: 'bg-red-500',
    accentBarClass: 'bg-red-500/80',
  },
  INSUFFICIENT_DATA: {
    label: 'Données insuffisantes',
    colorClass: 'text-muted-foreground',
    bgClass: 'from-muted/30 border-border',
    dotClass: 'bg-muted-foreground',
    accentBarClass: 'bg-muted-foreground/30',
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
        label: 'Correct',
        arrow: '→',
        arrowDirection: 'neutral',
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'REDUCED':
      return {
        label: 'En récupération',
        arrow: '↗',
        arrowDirection: 'up',
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'LOW':
      return {
        label: 'Réduit',
        arrow: '↘',
        arrowDirection: 'down',
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'VERY_LOW':
      return {
        label: 'Épuisé',
        arrow: '↘',
        arrowDirection: 'down',
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'BASELINE_PENDING':
      return {
        label: 'Modèle en cours',
        arrow: '…',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Aucune donnée',
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
        label: 'Frais',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-emerald-600 dark:text-emerald-400',
        isAvailable: true,
      };
    case 'FUNCTIONAL_LOW':
      return {
        label: 'Fonctionnelle',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'FUNCTIONAL_HIGH':
      return {
        label: 'Fonctionnelle',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'ACCUMULATED':
      return {
        label: 'Accumulée',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'NON_FUNCTIONAL_RISK':
      return {
        label: 'Importante',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'OVERREACHING_RISK':
      return {
        label: 'Critique',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-700 dark:text-red-300',
        isAvailable: true,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Aucune donnée',
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
        label: 'Progression',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-emerald-600 dark:text-emerald-400',
        isAvailable: true,
      };
    case 'MAINTAINING':
      return {
        label: 'Maintien',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-blue-600 dark:text-blue-400',
        isAvailable: true,
      };
    case 'PLATEAUING':
      return {
        label: 'Plateau',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-amber-600 dark:text-amber-400',
        isAvailable: true,
      };
    case 'MALADAPTING':
      return {
        label: 'Inadaptation',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-orange-600 dark:text-orange-400',
        isAvailable: true,
      };
    case 'DETRAINING':
      return {
        label: 'Désentraînement',
        arrow: traj.arrow,
        arrowDirection: traj.direction,
        qualityClass: 'text-red-600 dark:text-red-400',
        isAvailable: true,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Aucune donnée',
        arrow: '—',
        arrowDirection: 'neutral',
        qualityClass: 'text-muted-foreground',
        isAvailable: false,
      };
  }
}

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
  INCREASE_LOAD: 'Développer ta condition',
  SUSTAIN: 'Maintenir les acquis',
  CONSOLIDATE: 'Consolider les adaptations',
  REDUCE_LOAD: "Absorber le stress d'entraînement",
  RECOVERY_PRIORITY: 'Récupération active',
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
      message: "Forcer davantage risque le surmenage — la fatigue s'accumule déjà.",
    };
  }
  if (worst >= 2 || (worst >= 1 && accumulating)) {
    return {
      level: 'caution',
      message: 'Dépasser la prescription pourrait retarder ta récupération.',
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
        label: `Systèmes alignés (${score}/100)`,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'PARTIALLY_ALIGNED':
      return {
        label: `Partiellement alignés (${score}/100)`,
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'CONFLICTING':
      return {
        label: `Systèmes en conflit (${score}/100)`,
        colorClass: 'text-orange-600 dark:text-orange-400',
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Données insuffisantes pour évaluer',
        colorClass: 'text-muted-foreground',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expected outcome projections — what happens if the athlete follows the plan
// ─────────────────────────────────────────────────────────────────────────────

export function mapRecoveryProjection(
  verdict: RecoveryDecisionVerdict,
  overreachingRisk: OverreachingRisk,
): string {
  if (verdict === 'OVERREACHED')
    return 'La récupération physiologique nécessite 2 à 3 jours — le repos est la voie la plus rapide.';
  if (verdict === 'FATIGUED')
    return "Une récupération active aujourd'hui accélère la forme pour demain.";
  if (verdict === 'PARTIALLY_RECOVERED') {
    if (overreachingRisk === 'HIGH' || overreachingRisk === 'CRITICAL') {
      return "La récupération s'améliorera si la charge est maîtrisée aujourd'hui.";
    }
    return 'La forme se rétablira complètement dans 24 à 48 heures.';
  }
  if (verdict === 'RECOVERED') {
    if (overreachingRisk === 'LOW')
      return "La bonne récupération devrait se maintenir jusqu'à demain.";
    return "La récupération est suffisante — gérez l'intensité de la séance pour la préserver.";
  }
  return '';
}

export function mapFatigueProjection(
  verdict: FatigueDecisionVerdict,
  trajectory: FatigueTrajectory,
  capacity: TrainingCapacity,
): string {
  if (verdict === 'REST_WEEK' || verdict === 'TAPER') {
    return 'Le repos permet à la fatigue accumulée de se dissiper complètement.';
  }
  if (verdict === 'REDUCE') {
    if (trajectory === 'ACCELERATING')
      return 'Réduire la charge maintenant prévient le surmenage non fonctionnel.';
    return "Lever le pied aujourd'hui évite que la fatigue ne s'aggrave.";
  }
  if (verdict === 'MAINTAIN') return 'La fatigue restera dans la plage fonctionnelle.';
  if (verdict === 'BUILD') {
    if (trajectory === 'RESOLVING')
      return "La fatigue se dissipe — une séance bien dosée maintenant maximise l'adaptation.";
    if (capacity === 'FULL')
      return "La fatigue est gérable — pleine capacité d'entraînement disponible.";
    return "Fatigue gérable — capacité d'entraînement dans la plage normale.";
  }
  return '';
}

export function mapAdaptationProjection(
  verdict: AdaptationDecisionVerdict,
  loadMultiplier: number,
): string {
  if (verdict === 'RECOVERY_PRIORITY')
    return "L'investissement en récupération protège ta base de forme à long terme.";
  if (verdict === 'REDUCE_LOAD')
    return "Réduire la charge maintenant laisse les adaptations récentes s'ancrer.";
  if (verdict === 'CONSOLIDATE')
    return 'Une charge régulière consolide les adaptations des dernières semaines.';
  if (verdict === 'SUSTAIN') return 'La charge actuelle maintient tes gains de forme.';
  if (verdict === 'INCREASE_LOAD') {
    if (loadMultiplier > 1.1)
      return "Un stimulus de qualité aujourd'hui entraîne des gains mesurables dans 10 à 14 jours.";
    return 'Une surcharge progressive se cumulera en gains de forme dans les semaines à venir.';
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable intensity and capacity labels
// ─────────────────────────────────────────────────────────────────────────────

const INTENSITY_LABEL: Record<RecommendedIntensity, string> = {
  REST: 'Repos complet',
  VERY_EASY: 'Mouvement très léger',
  EASY: 'Effort facile',
  MODERATE: 'Effort modéré',
  HARD: 'Haute intensité',
};

export function mapRecoveryIntensityLabel(intensity: RecommendedIntensity): string {
  return INTENSITY_LABEL[intensity];
}

const CAPACITY_LABEL: Record<TrainingCapacity, string> = {
  FULL: 'Capacité totale',
  REDUCED: 'Capacité réduite',
  LIGHT_ONLY: 'Activité légère uniquement',
  REST_ONLY: 'Repos uniquement',
};

export function mapFatigueCapacityLabel(capacity: TrainingCapacity): string {
  return CAPACITY_LABEL[capacity];
}

// ─────────────────────────────────────────────────────────────────────────────
// Score color — maps a 0–100 score to a Tailwind color class
// ─────────────────────────────────────────────────────────────────────────────

export function mapScoreToColorClass(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ─────────────────────────────────────────────────────────────────────────────
// Autonomic balance — HRV + RHR system status
// ─────────────────────────────────────────────────────────────────────────────

export type AutonomicBalance =
  'ENHANCED' | 'NORMAL' | 'MILDLY_SUPPRESSED' | 'SUPPRESSED' | 'CRITICALLY_SUPPRESSED';

const AUTONOMIC_BALANCE_DISPLAY: Record<AutonomicBalance, { label: string; colorClass: string }> = {
  ENHANCED: {
    label: 'Système nerveux optimisé',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  NORMAL: { label: 'Équilibre normal', colorClass: 'text-blue-600 dark:text-blue-400' },
  MILDLY_SUPPRESSED: {
    label: 'Légèrement supprimé',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  SUPPRESSED: { label: 'Supprimé', colorClass: 'text-orange-600 dark:text-orange-400' },
  CRITICALLY_SUPPRESSED: {
    label: 'Critique',
    colorClass: 'text-red-600 dark:text-red-400',
  },
};

export function mapAutonomicBalanceToDisplay(balance: AutonomicBalance): {
  label: string;
  colorClass: string;
} {
  return AUTONOMIC_BALANCE_DISPLAY[balance];
}

// ─────────────────────────────────────────────────────────────────────────────
// Subjective wellness — self-reported readiness
// ─────────────────────────────────────────────────────────────────────────────

export type SubjectiveWellness = 'HIGH' | 'NORMAL' | 'LOW' | 'VERY_LOW';

const SUBJECTIVE_WELLNESS_DISPLAY: Record<
  SubjectiveWellness,
  { label: string; colorClass: string }
> = {
  HIGH: { label: 'Bien-être élevé', colorClass: 'text-emerald-600 dark:text-emerald-400' },
  NORMAL: { label: 'Bien-être normal', colorClass: 'text-blue-600 dark:text-blue-400' },
  LOW: { label: 'Bien-être faible', colorClass: 'text-amber-600 dark:text-amber-400' },
  VERY_LOW: { label: 'Bien-être très faible', colorClass: 'text-red-600 dark:text-red-400' },
};

export function mapSubjectiveWellnessToDisplay(wellness: SubjectiveWellness): {
  label: string;
  colorClass: string;
} {
  return SUBJECTIVE_WELLNESS_DISPLAY[wellness];
}

// ─────────────────────────────────────────────────────────────────────────────
// Load stress context — training load vs recovery capacity
// ─────────────────────────────────────────────────────────────────────────────

export type LoadStressContext = 'UNDERTRAINED' | 'OPTIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

const LOAD_STRESS_CONTEXT_DISPLAY: Record<
  LoadStressContext,
  { label: string; colorClass: string }
> = {
  UNDERTRAINED: {
    label: 'Charge insuffisante',
    colorClass: 'text-blue-600 dark:text-blue-400',
  },
  OPTIMAL: { label: 'Charge optimale', colorClass: 'text-emerald-600 dark:text-emerald-400' },
  ELEVATED: { label: 'Charge élevée', colorClass: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'Charge très élevée', colorClass: 'text-orange-600 dark:text-orange-400' },
  CRITICAL: { label: 'Charge critique', colorClass: 'text-red-600 dark:text-red-400' },
};

export function mapLoadStressContextToDisplay(context: LoadStressContext): {
  label: string;
  colorClass: string;
} {
  return LOAD_STRESS_CONTEXT_DISPLAY[context];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep adequacy signal — from recovery model signals
// ─────────────────────────────────────────────────────────────────────────────

export type SleepAdequacySignal =
  'EXCELLENT' | 'ADEQUATE' | 'INSUFFICIENT' | 'SEVERELY_INSUFFICIENT';

const SLEEP_ADEQUACY_SIGNAL_DISPLAY: Record<
  SleepAdequacySignal,
  { label: string; colorClass: string }
> = {
  EXCELLENT: {
    label: 'Sommeil excellent',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ADEQUATE: { label: 'Sommeil suffisant', colorClass: 'text-blue-600 dark:text-blue-400' },
  INSUFFICIENT: {
    label: 'Sommeil insuffisant',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  SEVERELY_INSUFFICIENT: {
    label: 'Sommeil très insuffisant',
    colorClass: 'text-red-600 dark:text-red-400',
  },
};

export function mapSleepAdequacySignalToDisplay(adequacy: SleepAdequacySignal): {
  label: string;
  colorClass: string;
} {
  return SLEEP_ADEQUACY_SIGNAL_DISPLAY[adequacy];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue type — dominant fatigue mechanism
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueType =
  | 'LOAD_DOMINANT'
  | 'NEUROMUSCULAR_DOMINANT'
  | 'METABOLIC_DOMINANT'
  | 'PSYCHOLOGICAL_DOMINANT'
  | 'CUMULATIVE_MULTI_SYSTEM'
  | 'MIXED'
  | 'UNDETERMINED';

const FATIGUE_TYPE_LABEL: Record<FatigueType, string> = {
  LOAD_DOMINANT: "Surcharge d'entraînement",
  NEUROMUSCULAR_DOMINANT: 'Fatigue neuromusculaire',
  METABOLIC_DOMINANT: 'Fatigue métabolique',
  PSYCHOLOGICAL_DOMINANT: 'Fatigue psychologique',
  CUMULATIVE_MULTI_SYSTEM: 'Accumulation multi-systèmes',
  MIXED: 'Fatigue mixte',
  UNDETERMINED: 'Non déterminé',
};

export function mapFatigueTypeToLabel(type: FatigueType): string {
  return FATIGUE_TYPE_LABEL[type];
}
