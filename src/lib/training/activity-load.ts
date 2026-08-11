import { ActivityType } from '@prisma/client';

export interface ActivityForAnalytics {
  date: Date;
  type: ActivityType;
  duration: number | null;
  load: number | null;
  bikeMetrics: { tss: number | null } | null;
}

/**
 * Load (TSS) estimation factors used when no precise metric is available.
 * Based on the typical mean intensity of each discipline.
 *
 * Formula: estimated TSS = duration_min × factor
 *
 * These are coarse approximations. Real TSS should come from:
 * - Bike: power (NP / FTP)
 * - Run / other: heart rate (avgHR / LTHR)
 *
 * Sources:
 * - Coggan & Allen (2006) "Training and Racing with a Power Meter"
 * - Friel, J. (2009) "The Triathlete's Training Bible" (hrTSS)
 *
 * LIMITATIONS:
 * - Assumes constant mean intensity (reality: highly variable)
 * - No zone distinction (Z2 vs VO2max)
 * - Error can reach ±30% depending on the real session profile
 * - Use only when no HR or power data exists
 *
 * KNOWN DEBT: `src/core/features/extractors/session-extractor.ts` ranks this
 * duration-factor method last in a five-tier cascade (power → TRIMP-HR → pace →
 * Foster session-RPE → duration). This module is currently the *primary* method
 * on the legacy read path, which is the wrong ordering. Unifying the two
 * pipelines is tracked separately; do not add sports here in the meantime.
 *
 * @see docs/models/TRAINING_STRESS_MODEL.md
 * @see knowledge/training-load.md
 */
const LOAD_FACTOR: Record<ActivityType, number> = {
  /** Run: 1.0 TSS/min (mean tempo/threshold intensity for a typical session) */
  RUN: 1.0,
  /** Bike: 0.85 TSS/min (slightly less intense than running on average) */
  BIKE: 0.85,
  /** Swim: 1.1 TSS/min (metabolically harder at equivalent perceived effort) */
  SWIM: 1.1,
  /** Strength: 0.7 TSS/min (inter-set rest, intermittent load) */
  STRENGTH: 0.7,
  /** Multisport race: conservative fallback when Garmin only reports the whole session. */
  TRIATHLON: 0.95,
  /** Hike: 0.8 TSS/min (sustained but submaximal, variable pack weight). */
  HIKE: 0.8,
  /** Other: cautious proxy while no sport-specific model exists. */
  OTHER: 0.75,
};

export function estimateActivityLoad(activity: ActivityForAnalytics): number {
  if (activity.load != null && activity.load > 0) return activity.load;
  if (activity.bikeMetrics?.tss != null && activity.bikeMetrics.tss > 0) {
    return activity.bikeMetrics.tss;
  }
  if (!activity.duration) return 0;
  const minutes = activity.duration / 60;
  return Math.round(minutes * LOAD_FACTOR[activity.type]);
}
