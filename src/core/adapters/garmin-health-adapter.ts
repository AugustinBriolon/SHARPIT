/**
 * ADAPTER — Garmin Daily Health → RawObservation[]
 *
 * Pure functions. No I/O. No side effects.
 *
 * A single GarminDailyHealth record maps to UP TO 5 distinct observations:
 *   - RawSleepObservation         (sleep data)
 *   - RawHrvObservation           (overnight HRV)
 *   - RawRestingHrObservation     (resting heart rate)
 *   - RawGarminReadinessObservation (Garmin Training Readiness — PROPRIETARY_MODEL)
 *   - RawBodyBatteryObservation   (Garmin Body Battery — PROPRIETARY_MODEL)
 *
 * Each observation is independent. The caller ingests them separately through
 * the engine so each gets its own id, quality, and trainingDayId assignment.
 *
 * IMPORTANT: The `calendarDate` parameter is the DailyHealth.date from Prisma.
 * Per the convention in garmin-sync.ts, this is stored as midnight UTC but
 * represents midnight LOCAL time in the athlete's timezone. Timestamp arithmetic
 * performed here preserves this convention.
 */

import type { GarminDailyHealth } from '@/lib/integrations/garmin';

import type {
  RawSleepObservation,
  RawHrvObservation,
  RawRestingHrObservation,
  RawGarminReadinessObservation,
  RawBodyBatteryObservation,
  RawObservation,
} from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds minutes to a base Date.
 */
function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

/**
 * Reconstructs the bedtime timestamp from the Garmin "minutes since midnight" value.
 *
 * If sleepBedtimeMin >= 720 (after noon), bedtime was in the EVENING of the
 * PREVIOUS calendar day relative to calendarDate.
 * Example: date = 2026-07-02, sleepBedtimeMin = 1380 (23:00)
 *          → bedtime = 2026-07-01 23:00
 *
 * If sleepBedtimeMin < 720 (before noon), the athlete went to bed AFTER midnight
 * on the same calendar day.
 * Example: date = 2026-07-02, sleepBedtimeMin = 30 (00:30)
 *          → bedtime = 2026-07-02 00:30
 */
function bedtimeToDate(calendarDate: Date, sleepBedtimeMin: number): Date {
  const ONE_DAY_MS = 24 * 60 * 60_000;
  if (sleepBedtimeMin >= 720) {
    const previousDay = new Date(calendarDate.getTime() - ONE_DAY_MS);
    return addMinutes(previousDay, sleepBedtimeMin);
  }
  return addMinutes(calendarDate, sleepBedtimeMin);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-signal converters
// ─────────────────────────────────────────────────────────────────────────────

function toSleepObservation(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawSleepObservation | null {
  if (health.sleepMinutes == null || health.sleepMinutes <= 0) return null;

  const { sleep } = health;

  // Reconstruct bedtime and wake timestamps
  let timestamp: Date;
  let wakeTimestamp: Date;

  if (sleep.sleepBedtimeMin != null && sleep.sleepWakeMin != null) {
    timestamp = bedtimeToDate(calendarDate, sleep.sleepBedtimeMin);
    wakeTimestamp = addMinutes(calendarDate, sleep.sleepWakeMin);
  } else if (sleep.sleepWakeMin != null) {
    // Know wake time, estimate bedtime from total duration
    wakeTimestamp = addMinutes(calendarDate, sleep.sleepWakeMin);
    timestamp = new Date(wakeTimestamp.getTime() - health.sleepMinutes * 60_000);
  } else {
    // No timing data: use midnight as wake time, estimate bedtime
    wakeTimestamp = calendarDate;
    timestamp = new Date(calendarDate.getTime() - health.sleepMinutes * 60_000);
  }

  return {
    type: 'SLEEP',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    wakeTimestamp,
    totalMinutes: health.sleepMinutes,
    deepMin: sleep.sleepDeepMin ?? undefined,
    remMin: sleep.sleepRemMin ?? undefined,
    lightMin: sleep.sleepLightMin ?? undefined,
    awakeMin: sleep.sleepAwakeMin ?? undefined,
    garminScore: sleep.sleepScore ?? undefined,
    avgRespirationRate: sleep.sleepRespiration ?? undefined,
    avgStressDuringSleep: sleep.sleepAvgStress ?? undefined,
    bedtimeMinFromMidnight: sleep.sleepBedtimeMin ?? undefined,
    wakeMinFromMidnight: sleep.sleepWakeMin ?? undefined,
    scoreFeedbackCode: sleep.sleepScoreFeedback ?? undefined,
  };
}

function toHrvObservation(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawHrvObservation | null {
  if (health.hrv == null || health.hrv <= 0) return null;

  // HRV is measured overnight — we use the wake time as the observation timestamp
  // (this is the point at which the overnight HRV becomes a "readiness indicator")
  const { sleep } = health;
  const timestamp =
    sleep.sleepWakeMin != null
      ? addMinutes(calendarDate, sleep.sleepWakeMin)
      : // Fallback: 06:00 on the report day (typical morning measurement)
        addMinutes(calendarDate, 360);

  return {
    type: 'HRV',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    valueMsRmssd: health.hrv,
    measurementMethod: 'OVERNIGHT_AVERAGE',
    garminStatus: health.hrvStatus ?? undefined,
    garminBaselineLow: health.hrvBaselineLow ?? undefined,
    garminBaselineHigh: health.hrvBaselineHigh ?? undefined,
  };
}

function toRestingHrObservation(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawRestingHrObservation | null {
  if (health.restingHr == null || health.restingHr <= 0) return null;

  // Resting HR is typically measured in the early morning
  const { sleep } = health;
  const timestamp =
    sleep.sleepWakeMin != null
      ? addMinutes(calendarDate, sleep.sleepWakeMin)
      : addMinutes(calendarDate, 360); // fallback: 06:00

  return {
    type: 'RESTING_HR',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    valueBpm: health.restingHr,
  };
}

function toReadinessObservation(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawGarminReadinessObservation | null {
  if (health.readinessScore == null) return null;

  // Readiness is computed at the start of the day
  const timestamp = addMinutes(calendarDate, 360); // 06:00

  return {
    type: 'GARMIN_READINESS',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    score: health.readinessScore,
    level: health.readinessLevel ?? undefined,
    feedbackCode: health.readinessFeedback ?? undefined,
    contributingFactors: health.readinessFactors
      ? health.readinessFactors.map((f) => f.key)
      : undefined,
  };
}

function toBodyBatteryObservation(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawBodyBatteryObservation | null {
  if (health.bodyBattery == null) return null;

  // Body Battery peak is typically in the morning
  const timestamp = addMinutes(calendarDate, 360);

  return {
    type: 'GARMIN_BATTERY',
    source: 'GARMIN',
    timestamp,
    receivedAt,
    peakValue: health.bodyBattery,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a single GarminDailyHealth record into multiple RawObservations.
 * Returns only observations that have actual data (null values are filtered out).
 *
 * @param health  — The health record from the Garmin API
 * @param calendarDate — The DailyHealth.date (midnight UTC = midnight local by convention)
 * @param receivedAt — When SHARPIT received this data
 */
export function garminHealthToObservations(
  health: GarminDailyHealth,
  calendarDate: Date,
  receivedAt: Date,
): RawObservation[] {
  const observations: Array<RawObservation | null> = [
    toSleepObservation(health, calendarDate, receivedAt),
    toHrvObservation(health, calendarDate, receivedAt),
    toRestingHrObservation(health, calendarDate, receivedAt),
    toReadinessObservation(health, calendarDate, receivedAt),
    toBodyBatteryObservation(health, calendarDate, receivedAt),
  ];

  return observations.filter((o): o is RawObservation => o !== null);
}
