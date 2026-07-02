/**
 * ADAPTER — Garmin Activity → RawObservation
 *
 * Pure functions. No I/O. No side effects.
 *
 * Converts Garmin Connect's IActivity + evaluation into SHARPIT domain types:
 *   - RawSessionObservation  (the physical training event)
 *   - RawSubjectiveObservation (RPE + feeling, as a separate observation)
 *
 * Design decision: RPE and feeling are NOT part of RawSessionObservation.
 * They are a separate subjective observation that references the session via
 * sessionExternalId. This preserves the invariant that subjective experience
 * is an independent observation layer, not a property of the physical event.
 */

import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';

import type {
  RawSessionObservation,
  RawSubjectiveObservation,
  SportType,
  SessionPowerData,
  SessionHrData,
  SessionPaceData,
} from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// SportType mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps Garmin's activityType.typeKey to SHARPIT's SportType.
 * Returns null for unsupported activity types (skipped by the sync).
 */
export function mapGarminSportType(typeKey: string): SportType | null {
  const k = typeKey.toLowerCase();

  if (k === 'trail_running') return 'TRAIL_RUN';
  if (
    k.includes('run') ||
    k === 'treadmill_running' ||
    k === 'street_running' ||
    k === 'track_running' ||
    k === 'virtual_run'
  )
    return 'RUN';
  if (k === 'mountain_biking' || k === 'gravel_cycling' || k === 'mtb') return 'MTB';
  if (
    k.includes('cycl') ||
    k.includes('bike') ||
    k.includes('ride') ||
    k === 'virtual_ride' ||
    k === 'indoor_cycling'
  )
    return 'BIKE';
  if (k === 'open_water_swimming') return 'OPEN_WATER';
  if (k.includes('swim') || k === 'lap_swimming') return 'SWIM';
  if (k === 'triathlon' || k === 'duathlon') return 'TRIATHLON';
  if (k === 'yoga' || k === 'pilates') return 'YOGA';
  if (
    k.includes('strength') ||
    k.includes('hiit') ||
    k.includes('cardio') ||
    k.includes('fitness') ||
    k === 'indoor_cardio'
  )
    return 'STRENGTH';

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration extraction
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts the most appropriate duration in seconds from a Garmin activity. */
function extractDurationSec(activity: IActivity, sportType: SportType): number | null {
  // Strength: use elapsed time (includes rest periods between sets)
  // All others: use moving time (excludes pauses)
  const candidates =
    sportType === 'STRENGTH'
      ? [activity.elapsedDuration, activity.duration, activity.movingDuration]
      : [activity.movingDuration, activity.duration, activity.elapsedDuration];

  for (const v of candidates) {
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    // Garmin sometimes returns milliseconds instead of seconds
    const sec = v > 1_000_000 ? Math.round(v / 1000) : Math.round(v);
    if (sec > 0) return sec;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Garmin activity to a RawSessionObservation.
 * Returns null if the activity type is not supported by SHARPIT.
 */
export function garminActivityToSession(
  activity: IActivity,
  receivedAt: Date,
): RawSessionObservation | null {
  const sportType = mapGarminSportType(activity.activityType?.typeKey ?? '');
  if (!sportType) return null;

  const durationSec = extractDurationSec(activity, sportType);
  if (!durationSec) return null;

  const externalId = String(activity.activityId);
  const timestamp = new Date(activity.startTimeLocal);

  // Power data (if available — indicates a power meter was used)
  let powerData: SessionPowerData | undefined;
  const avgPower =
    typeof activity.avgPower === 'number' && activity.avgPower > 0 ? activity.avgPower : null;
  if (avgPower) {
    const normPower =
      typeof activity.normPower === 'number' && activity.normPower > 0
        ? activity.normPower
        : undefined;
    const tss =
      typeof activity.trainingStressScore === 'number' && activity.trainingStressScore > 0
        ? activity.trainingStressScore
        : typeof activity.activityTrainingLoad === 'number' && activity.activityTrainingLoad > 0
          ? activity.activityTrainingLoad
          : undefined;
    powerData = {
      avgWatts: avgPower,
      normalizedPower: normPower,
      sourceComputedTss: tss,
      // Garmin's power for cycling is typically from a power meter
      // Garmin running power is optical/estimated
      quality: sportType === 'BIKE' || sportType === 'MTB' ? 'MEASURED_DIRECT' : 'MEASURED_OPTICAL',
    };
  }

  // HR data
  let hrData: SessionHrData | undefined;
  if (activity.averageHR && activity.averageHR > 0) {
    hrData = {
      avgBpm: Math.round(activity.averageHR),
      maxBpm: activity.maxHR ? Math.round(activity.maxHR) : undefined,
      quality: 'MEASURED_OPTICAL', // Garmin wrist HR
    };
  }

  // Pace data (for running/swimming/open-water)
  let paceData: SessionPaceData | undefined;
  if (activity.averageSpeed && activity.averageSpeed > 0 && activity.distance > 0) {
    if (['RUN', 'TRAIL_RUN', 'SWIM', 'OPEN_WATER'].includes(sportType)) {
      paceData = {
        avgMinPerKm: 1000 / activity.averageSpeed / 60,
        distanceM: activity.distance,
      };
    }
  }

  // Source-provided stress (TSS from Garmin, without power data)
  let sourceProvidedStress: RawSessionObservation['sourceProvidedStress'];
  if (!powerData) {
    const tss =
      typeof activity.trainingStressScore === 'number' && activity.trainingStressScore > 0
        ? activity.trainingStressScore
        : typeof activity.activityTrainingLoad === 'number' && activity.activityTrainingLoad > 0
          ? activity.activityTrainingLoad
          : null;
    if (tss) {
      sourceProvidedStress = {
        value: tss,
        quality: hrData ? 'ESTIMATED' : 'PROPRIETARY_MODEL',
      };
    }
  }

  return {
    type: 'SESSION',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    sportType,
    durationSec,
    externalId,
    title: activity.activityName || undefined,
    powerData,
    hrData,
    paceData,
    elevationM: activity.elevationGain > 0 ? activity.elevationGain : undefined,
    calories: activity.calories > 0 ? Math.round(activity.calories) : undefined,
    sourceProvidedStress,
  };
}

/**
 * Converts Garmin's post-workout evaluation (RPE + feeling) into a
 * RawSubjectiveObservation linked to the session via sessionExternalId.
 * Returns null if neither RPE nor feeling is available.
 */
export function garminEvaluationToSubjective(
  evaluation: { rpe: number | null; feeling: string | null; notes: string | null },
  sessionExternalId: string,
  sessionTimestamp: Date,
  receivedAt: Date,
): RawSubjectiveObservation | null {
  if (evaluation.rpe == null && evaluation.feeling == null) return null;

  // Map Garmin feeling label to mood scale (1–5)
  const moodMap: Record<string, number> = {
    'Très mal': 1,
    Mal: 2,
    Correct: 3,
    Bien: 4,
    'Très bien': 5,
  };
  const mood = evaluation.feeling ? (moodMap[evaluation.feeling] ?? undefined) : undefined;

  return {
    type: 'SUBJECTIVE',
    source: 'GARMIN',
    timestamp: sessionTimestamp,
    receivedAt,
    rpe: evaluation.rpe ?? undefined,
    mood,
    sessionExternalId,
    notes: evaluation.notes ?? undefined,
  };
}
