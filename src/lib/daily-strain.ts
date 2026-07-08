import type { ActivityType } from '@prisma/client';
import type { SessionFeatureSet } from '@/core/features/types';

export const DAILY_STRAIN_MAX = 21;
const DAILY_TSS_UPPER_REFERENCE = 300;
const DAILY_TSS_LOG_SCALE = 25;

function legacyDurationTssPerHour(type: ActivityType): number {
  switch (type) {
    case 'RUN':
      return 60;
    case 'BIKE':
      return 55;
    case 'SWIM':
      return 65;
    case 'STRENGTH':
      return 35;
    default:
      return 45;
  }
}

export type DailyStrainTier = 'STRUCTURED_SESSION' | 'HEART_RATE' | 'MOVEMENT' | 'UNKNOWN';

export type DailyStrainSource =
  | 'SESSION_FEATURE_POWER'
  | 'SESSION_FEATURE_TRIMP'
  | 'SESSION_FEATURE_PACE'
  | 'SESSION_FEATURE_RPE'
  | 'SESSION_FEATURE_DURATION'
  | 'LEGACY_POWER_TSS'
  | 'LEGACY_SOURCE_TSS'
  | 'LEGACY_TRIMP'
  | 'LEGACY_DURATION'
  | 'DAILY_HEALTH_STRESS'
  | 'DAILY_HEALTH_RECOVERY'
  | 'DAILY_HEALTH_BODY_BATTERY'
  | 'UNKNOWN';

export type DailyStrainThresholds = {
  ftpW?: number | null;
  maxHr?: number | null;
  restingHr?: number | null;
  lthr?: number | null;
};

export type LegacyDailyStrainActivity = {
  type: ActivityType;
  duration: number | null;
  load: number | null;
  runMetrics?: {
    avgHr?: number | null;
    paceSecPerKm?: number | null;
    distanceM?: number | null;
  } | null;
  bikeMetrics?: {
    tss?: number | null;
    normalizedPower?: number | null;
    avgPower?: number | null;
  } | null;
};

export type DailyStrainHealthSignals = {
  calories?: number | null;
  recoveryScore?: number | null;
  stress?: number | null;
  bodyBattery?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
};

export type DailyStrainContributor = 'TRAINING' | 'CARDIOVASCULAR' | 'MOVEMENT' | 'UNKNOWN';

export type DailyStrainContribution = {
  available: boolean;
  contributor: DailyStrainContributor;
  load: number | null;
  score: number | null;
  confidence: number;
  source: DailyStrainSource;
};

export type DailyStrainResult = {
  available: boolean;
  dailyTss: number | null;
  strainScore: number | null;
  tier: DailyStrainTier;
  source: DailyStrainSource;
  dominantContributor: DailyStrainContributor;
  confidence: number;
  structuredSessionDetected: boolean;
  fallbackUsed: boolean;
  contributions: {
    training: DailyStrainContribution;
    cardiovascular: DailyStrainContribution;
    movement: DailyStrainContribution;
  };
  trace: {
    sessionCount: number;
    activityCount: number;
    sessionMethods: string[];
    cardiovascularSignals: {
      stress: number | null;
      recoveryScore: number | null;
      bodyBattery: number | null;
      calories: number | null;
    };
  };
};

type ComputedLoad = {
  tss: number;
  tier: DailyStrainTier;
  source: DailyStrainSource;
  confidence: number;
  contributor: Exclude<DailyStrainContributor, 'UNKNOWN'>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function dailyTssToStrainScore(dailyTss: number | null): number | null {
  if (dailyTss == null || dailyTss <= 0) return 0;
  const normalized =
    Math.log1p(dailyTss / DAILY_TSS_LOG_SCALE) /
    Math.log1p(DAILY_TSS_UPPER_REFERENCE / DAILY_TSS_LOG_SCALE);
  return Math.round(clamp(normalized, 0, 1) * DAILY_STRAIN_MAX * 10) / 10;
}

function computePowerTss(
  durationSec: number,
  normalizedPower: number,
  ftpW: number,
): number | null {
  if (durationSec <= 0 || normalizedPower <= 0 || ftpW <= 0) return null;
  const durationHr = durationSec / 3600;
  const intensityFactor = normalizedPower / ftpW;
  return intensityFactor * intensityFactor * durationHr * 100;
}

function computeTrimpTss(
  durationSec: number,
  avgBpm: number,
  maxHr: number,
  restingHr: number,
  lthr?: number | null,
): number | null {
  if (durationSec <= 0 || avgBpm <= 0 || maxHr <= restingHr) return null;

  const durationMin = durationSec / 60;
  const hrRange = maxHr - restingHr;
  const hrr = clamp((avgBpm - restingHr) / hrRange, 0, 1);
  const trimp = durationMin * hrr * 0.64 * Math.exp(1.92 * hrr);

  const effectiveLthr = lthr && lthr > 0 ? lthr : maxHr * 0.85;
  const hrrLt = clamp((effectiveLthr - restingHr) / hrRange, 0, 1);
  const thresholdTrimp = 60 * hrrLt * 0.64 * Math.exp(1.92 * hrrLt);

  if (thresholdTrimp <= 0) return null;
  return (trimp / thresholdTrimp) * 100;
}

function mapSessionMethodToTier(method: string): {
  tier: DailyStrainTier;
  source: DailyStrainSource;
} {
  switch (method) {
    case 'POWER_BASED':
      return { tier: 'STRUCTURED_SESSION', source: 'SESSION_FEATURE_POWER' };
    case 'TRIMP_HR':
      return { tier: 'HEART_RATE', source: 'SESSION_FEATURE_TRIMP' };
    case 'PACE_BASED':
      return { tier: 'STRUCTURED_SESSION', source: 'SESSION_FEATURE_PACE' };
    case 'RPE_BASED':
      return { tier: 'MOVEMENT', source: 'SESSION_FEATURE_RPE' };
    case 'DURATION_FACTOR':
    default:
      return { tier: 'MOVEMENT', source: 'SESSION_FEATURE_DURATION' };
  }
}

function rankTier(tier: DailyStrainTier) {
  switch (tier) {
    case 'STRUCTURED_SESSION':
      return 3;
    case 'HEART_RATE':
      return 2;
    case 'MOVEMENT':
      return 1;
    case 'UNKNOWN':
    default:
      return 0;
  }
}

function computeFromSessionFeatures(sessions: readonly SessionFeatureSet[]): ComputedLoad[] {
  return sessions
    .filter((session) => typeof session.tssScore === 'number' && Number.isFinite(session.tssScore))
    .map((session) => {
      const mapped = mapSessionMethodToTier(session.tssMethod);
      return {
        tss: session.tssScore,
        tier: mapped.tier,
        source: mapped.source,
        confidence: session.confidence,
        contributor: 'TRAINING' as const,
      };
    })
    .filter((load) => load.tss > 0);
}

function computeFromLegacyActivities(
  activities: readonly LegacyDailyStrainActivity[],
  thresholds: DailyStrainThresholds,
): ComputedLoad[] {
  return activities
    .map((activity): ComputedLoad | null => {
      const durationSec = activity.duration ?? 0;
      const bikeNormalizedPower = activity.bikeMetrics?.normalizedPower ?? null;
      const bikeTss = activity.bikeMetrics?.tss ?? null;

      if (bikeNormalizedPower != null && thresholds.ftpW && thresholds.ftpW > 0) {
        const tss = computePowerTss(durationSec, bikeNormalizedPower, thresholds.ftpW);
        if (tss != null && tss > 0) {
          return {
            tss,
            tier: 'STRUCTURED_SESSION',
            source: 'LEGACY_POWER_TSS',
            confidence: 0.9,
            contributor: 'TRAINING',
          };
        }
      }

      if (bikeTss != null && bikeTss > 0) {
        return {
          tss: bikeTss,
          tier: 'STRUCTURED_SESSION',
          source: 'LEGACY_SOURCE_TSS',
          confidence: 0.7,
          contributor: 'TRAINING',
        };
      }

      if (activity.load != null && activity.load > 0) {
        return {
          tss: activity.load,
          tier: 'STRUCTURED_SESSION',
          source: 'LEGACY_SOURCE_TSS',
          confidence: 0.6,
          contributor: 'TRAINING',
        };
      }

      const avgHr = activity.runMetrics?.avgHr ?? null;
      if (
        avgHr != null &&
        thresholds.maxHr != null &&
        thresholds.restingHr != null &&
        thresholds.maxHr > thresholds.restingHr
      ) {
        const tss = computeTrimpTss(
          durationSec,
          avgHr,
          thresholds.maxHr,
          thresholds.restingHr,
          thresholds.lthr,
        );
        if (tss != null && tss > 0) {
          return {
            tss,
            tier: 'HEART_RATE',
            source: 'LEGACY_TRIMP',
            confidence: 0.65,
            contributor: 'TRAINING',
          };
        }
      }

      if (durationSec > 0) {
        const durationHours = durationSec / 3600;
        const perHour = legacyDurationTssPerHour(activity.type);

        return {
          tss: durationHours * perHour,
          tier: 'MOVEMENT',
          source: 'LEGACY_DURATION',
          confidence: 0.25,
          contributor: 'MOVEMENT',
        };
      }

      return null;
    })
    .filter((load): load is ComputedLoad => load != null);
}

function emptyContribution(
  contributor: DailyStrainContributor,
  source: DailyStrainSource = 'UNKNOWN',
): DailyStrainContribution {
  return {
    available: false,
    contributor,
    load: null,
    score: null,
    confidence: 0,
    source,
  };
}

function summarizeContribution(
  contributor: Exclude<DailyStrainContributor, 'UNKNOWN'>,
  loads: readonly ComputedLoad[],
): DailyStrainContribution {
  if (loads.length === 0) return emptyContribution(contributor);
  const load = loads.reduce((sum, item) => sum + item.tss, 0);
  const confidence = loads.reduce((sum, item) => sum + item.confidence, 0) / loads.length;
  const source =
    loads
      .slice()
      .sort((a, b) => rankTier(b.tier) - rankTier(a.tier) || b.confidence - a.confidence)[0]
      ?.source ?? 'UNKNOWN';

  return {
    available: true,
    contributor,
    load: Math.round(load),
    score: dailyTssToStrainScore(load),
    confidence: Math.round(confidence * 100) / 100,
    source,
  };
}

function clampRounded(value: number): number {
  return Math.round(clamp(value, 0, DAILY_TSS_UPPER_REFERENCE) * 10) / 10;
}

function computeCardiovascularLoad(
  health: DailyStrainHealthSignals | null | undefined,
): DailyStrainContribution {
  if (!health) return emptyContribution('CARDIOVASCULAR');

  const stressLoad = health.stress != null ? (clamp(health.stress, 0, 100) / 100) * 28 : 0;
  const recoveryLoad =
    health.recoveryScore != null ? (clamp(100 - health.recoveryScore, 0, 100) / 100) * 18 : 0;
  const bodyBatteryLoad =
    health.bodyBattery != null ? (clamp(100 - health.bodyBattery, 0, 100) / 100) * 16 : 0;

  const weights = [
    health.stress != null ? 0.45 : 0,
    health.recoveryScore != null ? 0.35 : 0,
    health.bodyBattery != null ? 0.2 : 0,
  ];
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);

  if (weightTotal === 0) return emptyContribution('CARDIOVASCULAR');

  const normalizedLoad =
    (stressLoad * weights[0] + recoveryLoad * weights[1] + bodyBatteryLoad * weights[2]) /
    weightTotal;
  const confidence =
    0.35 +
    (health.stress != null ? 0.25 : 0) +
    (health.recoveryScore != null ? 0.2 : 0) +
    (health.bodyBattery != null ? 0.1 : 0);

  let source: DailyStrainSource = 'DAILY_HEALTH_BODY_BATTERY';
  if (health.stress != null) {
    source = 'DAILY_HEALTH_STRESS';
  } else if (health.recoveryScore != null) {
    source = 'DAILY_HEALTH_RECOVERY';
  }

  return {
    available: normalizedLoad > 0,
    contributor: 'CARDIOVASCULAR',
    load: clampRounded(normalizedLoad),
    score: dailyTssToStrainScore(normalizedLoad),
    confidence: Math.round(clamp(confidence, 0, 0.9) * 100) / 100,
    source,
  };
}

function mergeMovementContribution(
  sessionLoads: readonly ComputedLoad[],
  legacyLoads: readonly ComputedLoad[],
): DailyStrainContribution {
  const movementLoads = [
    ...sessionLoads.filter((load) => load.contributor === 'MOVEMENT'),
    ...legacyLoads.filter((load) => load.contributor === 'MOVEMENT'),
  ];
  return summarizeContribution('MOVEMENT', movementLoads);
}

function pickTrainingLoads(
  sessionLoads: readonly ComputedLoad[],
  legacyLoads: readonly ComputedLoad[],
): { loads: readonly ComputedLoad[]; usingSessionLoads: boolean } {
  const sessionTrainingLoads = sessionLoads.filter((load) => load.contributor === 'TRAINING');
  const legacyTrainingLoads = legacyLoads.filter((load) => load.contributor === 'TRAINING');
  const bestSessionTier = sessionTrainingLoads.reduce(
    (best, load) => Math.max(best, rankTier(load.tier)),
    0,
  );
  const bestLegacyTier = legacyTrainingLoads.reduce(
    (best, load) => Math.max(best, rankTier(load.tier)),
    0,
  );

  if (sessionTrainingLoads.length === 0) {
    return { loads: legacyTrainingLoads, usingSessionLoads: false };
  }

  if (legacyTrainingLoads.length === 0) {
    return { loads: sessionTrainingLoads, usingSessionLoads: true };
  }

  return bestSessionTier >= bestLegacyTier
    ? { loads: sessionTrainingLoads, usingSessionLoads: true }
    : { loads: legacyTrainingLoads, usingSessionLoads: false };
}

function blendDailyLoad(contributions: DailyStrainResult['contributions']): {
  totalLoad: number | null;
  dominantContributor: DailyStrainContributor;
  dominantSource: DailyStrainSource;
  confidence: number;
  tier: DailyStrainTier;
} {
  const trainingLoad = contributions.training.load ?? 0;
  const cardioLoad = contributions.cardiovascular.load ?? 0;
  const movementLoad = contributions.movement.load ?? 0;

  const effectiveCardioComplement =
    trainingLoad > 0 ? Math.min(cardioLoad * 0.25, trainingLoad * 0.2) : cardioLoad;
  const effectiveMovementComplement =
    trainingLoad > 0 ? Math.min(movementLoad * 0.2, trainingLoad * 0.15) : movementLoad;

  const totalLoad = trainingLoad + effectiveCardioComplement + effectiveMovementComplement;
  const [dominant] = [
    { contributor: 'TRAINING' as const, source: contributions.training.source, load: trainingLoad },
    {
      contributor: 'CARDIOVASCULAR' as const,
      source: contributions.cardiovascular.source,
      load: effectiveCardioComplement,
    },
    {
      contributor: 'MOVEMENT' as const,
      source: contributions.movement.source,
      load: effectiveMovementComplement,
    },
  ].sort((a, b) => b.load - a.load);

  const confidenceComponents = [
    contributions.training.available ? contributions.training.confidence * 0.55 : 0,
    contributions.cardiovascular.available ? contributions.cardiovascular.confidence * 0.3 : 0,
    contributions.movement.available ? contributions.movement.confidence * 0.15 : 0,
  ];
  const confidence = confidenceComponents.reduce((sum, value) => sum + value, 0);

  let tier: DailyStrainTier = 'UNKNOWN';
  if (trainingLoad > 0)
    tier =
      contributions.training.source === 'SESSION_FEATURE_TRIMP' ||
      contributions.training.source === 'LEGACY_TRIMP'
        ? 'HEART_RATE'
        : 'STRUCTURED_SESSION';
  else if (effectiveCardioComplement > 0) tier = 'HEART_RATE';
  else if (effectiveMovementComplement > 0) tier = 'MOVEMENT';

  return {
    totalLoad: totalLoad > 0 ? Math.round(totalLoad) : null,
    dominantContributor: dominant?.load > 0 ? dominant.contributor : 'UNKNOWN',
    dominantSource: dominant?.load > 0 ? dominant.source : 'UNKNOWN',
    confidence: Math.round(clamp(confidence, 0, 1) * 100) / 100,
    tier,
  };
}

export function computeDailyStrain(params: {
  sessionFeatures: readonly SessionFeatureSet[];
  legacyActivities?: readonly LegacyDailyStrainActivity[];
  healthSignals?: DailyStrainHealthSignals | null;
  thresholds?: DailyStrainThresholds;
}): DailyStrainResult {
  const sessionLoads = computeFromSessionFeatures(params.sessionFeatures);
  const legacyLoads = computeFromLegacyActivities(
    params.legacyActivities ?? [],
    params.thresholds ?? {},
  );
  const structuredSessionDetected =
    params.sessionFeatures.length > 0 || (params.legacyActivities?.length ?? 0) > 0;
  const trainingSelection = pickTrainingLoads(sessionLoads, legacyLoads);
  const trainingLoads = trainingSelection.loads;
  const useSessionLoads = trainingSelection.usingSessionLoads;
  const contributions: DailyStrainResult['contributions'] = {
    training: summarizeContribution('TRAINING', trainingLoads),
    cardiovascular: computeCardiovascularLoad(params.healthSignals),
    movement: mergeMovementContribution(sessionLoads, legacyLoads),
  };
  const blended = blendDailyLoad(contributions);

  if (
    !contributions.training.available &&
    !contributions.cardiovascular.available &&
    !contributions.movement.available
  ) {
    return {
      available: false,
      dailyTss: null,
      strainScore: null,
      tier: 'UNKNOWN',
      source: 'UNKNOWN',
      dominantContributor: 'UNKNOWN',
      confidence: 0,
      structuredSessionDetected,
      fallbackUsed: false,
      contributions,
      trace: {
        sessionCount: params.sessionFeatures.length,
        activityCount: params.legacyActivities?.length ?? 0,
        sessionMethods: params.sessionFeatures.map((session) => session.tssMethod),
        cardiovascularSignals: {
          stress: params.healthSignals?.stress ?? null,
          recoveryScore: params.healthSignals?.recoveryScore ?? null,
          bodyBattery: params.healthSignals?.bodyBattery ?? null,
          calories: params.healthSignals?.calories ?? null,
        },
      },
    };
  }

  return {
    available: true,
    dailyTss: blended.totalLoad,
    strainScore: dailyTssToStrainScore(blended.totalLoad),
    tier: blended.tier,
    source: blended.dominantSource,
    dominantContributor: blended.dominantContributor,
    confidence: blended.confidence,
    structuredSessionDetected,
    fallbackUsed: !useSessionLoads,
    contributions,
    trace: {
      sessionCount: params.sessionFeatures.length,
      activityCount: params.legacyActivities?.length ?? 0,
      sessionMethods: params.sessionFeatures.map((session) => session.tssMethod),
      cardiovascularSignals: {
        stress: params.healthSignals?.stress ?? null,
        recoveryScore: params.healthSignals?.recoveryScore ?? null,
        bodyBattery: params.healthSignals?.bodyBattery ?? null,
        calories: params.healthSignals?.calories ?? null,
      },
    },
  };
}
