/**
 * Pure device capability checks — used by `motionConfig` so the low-end gate
 * can be unit-tested without poking at `navigator`.
 */

export type DeviceCapabilityHints = {
  /** Chromium `navigator.deviceMemory` (GiB). Absent on Safari. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

/**
 * True for devices that should skip non-essential motion.
 *
 * Memory ≤2 GiB is a clear signal. When `deviceMemory` is missing (Safari),
 * only treat ≤2 cores as low-end — a 4-core phone is not low-end and must
 * still get ADR-024's route reveal.
 */
export function isLowEndDevice(hints: DeviceCapabilityHints): boolean {
  if (hints.deviceMemory !== undefined && hints.deviceMemory <= 2) return true;
  if (
    hints.deviceMemory === undefined &&
    hints.hardwareConcurrency !== undefined &&
    hints.hardwareConcurrency > 0 &&
    hints.hardwareConcurrency <= 2
  ) {
    return true;
  }
  return false;
}
