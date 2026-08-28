/**
 * Soft corroboration of readiness from Garmin stress + Body Battery.
 *
 * Design invariants (RECOVERY_MODEL.md §4.3):
 *   - Proprietary Garmin scores are NEVER primary dimension inputs.
 *   - Adjustments are bounded so they cannot dominate autonomic/sleep/subjective.
 *   - Conservative bias: high stress / low battery can only lower readiness;
 *     high battery may slightly cushion a low score when stress is not elevated.
 */

import type { WearableEnergySignals } from './types';

const MAX_DOWNWARD_DELTA = 12;
const MAX_UPWARD_DELTA = 5;
/** Stress at/above this blocks any Body Battery uplift (conservative bias). */
const ELEVATED_STRESS_THRESHOLD = 45;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map Garmin daily stress (0–100) to a downward readiness delta.
 * Thresholds aligned with product interpretation in knowledge/garmin.md.
 */
function stressDownwardDelta(stress: number | null): number {
  if ((stress === undefined || stress === null)) {
    return 0;
  }
  if (stress >= 75) {
    return 10;
  }
  if (stress >= 60) {
    return 6;
  }
  if (stress >= ELEVATED_STRESS_THRESHOLD) {
    return 3;
  }
  return 0;
}

/**
 * Map Body Battery (0–100) to a readiness delta.
 * Low battery → downward; high battery → small upward cushion only.
 */
function bodyBatteryDelta(bodyBattery: number | null): number {
  if ((bodyBattery === undefined || bodyBattery === null)) {
    return 0;
  }
  if (bodyBattery < 25) {
    return -10;
  }
  if (bodyBattery < 40) {
    return -6;
  }
  if (bodyBattery >= 80) {
    return 4;
  }
  if (bodyBattery >= 70) {
    return 2;
  }
  return 0;
}

/**
 * Apply bounded wearable corroboration to a synthesized readiness score.
 * Returns the original score when no wearable signals are available.
 */
export function applyWearableEnergyCorroboration(
  readinessScore: number | null,
  signals: WearableEnergySignals | null | undefined,
): number | null {
  if ((readinessScore === undefined || readinessScore === null) || (signals === undefined || signals === null)) {
    return readinessScore;
  }
  if ((signals.stress === undefined || signals.stress === null) && (signals.bodyBattery === undefined || signals.bodyBattery === null)) {
    return readinessScore;
  }

  const stressDelta = -stressDownwardDelta(signals.stress);
  let batteryDelta = bodyBatteryDelta(signals.bodyBattery);

  // Never uplift when stress is meaningfully elevated.
  if ((signals.stress !== undefined && signals.stress !== null) && signals.stress >= ELEVATED_STRESS_THRESHOLD && batteryDelta > 0) {
    batteryDelta = 0;
  }

  const delta = clamp(stressDelta + batteryDelta, -MAX_DOWNWARD_DELTA, MAX_UPWARD_DELTA);
  return Math.round(clamp(readinessScore + delta, 0, 100));
}
