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

export type DailyStrainResult = {
  available: boolean;
  dailyTss: number | null;
  strainScore: number | null;
  tier: DailyStrainTier;
  source: DailyStrainSource;
  confidence: number;
  structuredSessionDetected: boolean;
  fallbackUsed: boolean;
  trace: {
    sessionCount: number;
    activityCount: number;
    sessionMethods: string[];
  };
};

type ComputedLoad = {
  tss: number;
  tier: DailyStrainTier;
  source: DailyStrainSource;
  confidence: number;
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

function reduceTier(current: DailyStrainTier, next: DailyStrainTier): DailyStrainTier {
  return rankTier(next) > rankTier(current) ? next : current;
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
          };
        }
      }

      if (bikeTss != null && bikeTss > 0) {
        return {
          tss: bikeTss,
          tier: 'STRUCTURED_SESSION',
          source: 'LEGACY_SOURCE_TSS',
          confidence: 0.7,
        };
      }

      if (activity.load != null && activity.load > 0) {
        return {
          tss: activity.load,
          tier: 'STRUCTURED_SESSION',
          source: 'LEGACY_SOURCE_TSS',
          confidence: 0.6,
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
        };
      }

      return null;
    })
    .filter((load): load is ComputedLoad => load != null);
}

export function computeDailyStrain(params: {
  sessionFeatures: readonly SessionFeatureSet[];
  legacyActivities?: readonly LegacyDailyStrainActivity[];
  thresholds?: DailyStrainThresholds;
}): DailyStrainResult {
  const sessionLoads = computeFromSessionFeatures(params.sessionFeatures);
  const legacyLoads = computeFromLegacyActivities(
    params.legacyActivities ?? [],
    params.thresholds ?? {},
  );
  const structuredSessionDetected =
    params.sessionFeatures.length > 0 || (params.legacyActivities?.length ?? 0) > 0;
  const bestSessionTier = sessionLoads.reduce(
    (best, load) => Math.max(best, rankTier(load.tier)),
    0,
  );
  const bestLegacyTier = legacyLoads.reduce((best, load) => Math.max(best, rankTier(load.tier)), 0);
  const useSessionLoads = sessionLoads.length > 0 && bestSessionTier >= bestLegacyTier;
  const chosenLoads = useSessionLoads ? sessionLoads : legacyLoads;

  if (chosenLoads.length === 0) {
    return {
      available: false,
      dailyTss: null,
      strainScore: null,
      tier: 'UNKNOWN',
      source: 'UNKNOWN',
      confidence: 0,
      structuredSessionDetected,
      fallbackUsed: false,
      trace: {
        sessionCount: params.sessionFeatures.length,
        activityCount: params.legacyActivities?.length ?? 0,
        sessionMethods: params.sessionFeatures.map((session) => session.tssMethod),
      },
    };
  }

  const dailyTss = chosenLoads.reduce((sum, load) => sum + load.tss, 0);
  const confidence =
    chosenLoads.reduce((sum, load) => sum + load.confidence, 0) / Math.max(chosenLoads.length, 1);
  const tier = chosenLoads.reduce(
    (best, load) => reduceTier(best, load.tier),
    'UNKNOWN' as DailyStrainTier,
  );
  const source = chosenLoads
    .slice()
    .sort((a, b) => rankTier(b.tier) - rankTier(a.tier) || b.confidence - a.confidence)[0]?.source;

  return {
    available: true,
    dailyTss: Math.round(dailyTss),
    strainScore: dailyTssToStrainScore(dailyTss),
    tier,
    source: source ?? 'UNKNOWN',
    confidence: Math.round(confidence * 100) / 100,
    structuredSessionDetected,
    fallbackUsed: !useSessionLoads,
    trace: {
      sessionCount: params.sessionFeatures.length,
      activityCount: params.legacyActivities?.length ?? 0,
      sessionMethods: params.sessionFeatures.map((session) => session.tssMethod),
    },
  };
}
