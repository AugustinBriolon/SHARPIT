/**
 * DEVELOPER PLATFORM — Deterministic Checksums
 *
 * Provides content-addressable fingerprints for Feature data payloads.
 * Used by the Replay Engine to verify that two independent replays of the
 * same observation history produce bit-identical feature values.
 *
 * Key invariant:
 *   checksum(featureData) is IDENTICAL for two replay runs given the same inputs.
 *   It IGNORES volatile metadata (id, computedAt, createdAt, version).
 *
 * Algorithm: SHA-256 of JSON.stringify(deepSortedKeys(data)).
 * Key sorting ensures determinism regardless of object key insertion order.
 */

import { createHash } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Key sorting for deterministic serialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively sort all object keys alphabetically.
 * Arrays preserve element order (order is semantically meaningful).
 * null/undefined/primitives pass through unchanged.
 */
export function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortObjectKeys(v)]),
    );
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checksum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a 16-character deterministic fingerprint of a feature data payload.
 *
 * Only the `data` field of a FeatureSetRecord should be hashed — not the
 * wrapper metadata (id, computedAt, version, etc.), which legitimately
 * differ between two replay runs.
 */
export function checksumFeatureData(data: unknown): string {
  const normalized = sortObjectKeys(data);
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
}

/**
 * Compute a map of checksums for a DayFeatures result.
 * Each key identifies the feature scope; each value is a content fingerprint.
 *
 * Keys:
 *   `session:{sessionObsId}` → SessionFeatureSet checksum
 *   `load:{trainingDayId}`   → LoadFeatureSet checksum
 *   `recovery:{trainingDayId}` → RecoveryFeatureSet checksum
 *   `body:{trainingDayId}`   → BodyFeatureSet checksum (if present)
 *   `condition:{trainingDayId}` → ConditionFeatureSet checksum
 */
export function checksumDayFeatures(
  dayFeatures: import('@/core/features/types').DayFeatures,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const session of dayFeatures.sessions) {
    result[`session:${session.sessionObsId}`] = checksumFeatureData(session);
  }

  if (dayFeatures.load !== 'PENDING') {
    result[`load:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.load);
  }

  if (dayFeatures.recovery !== 'PENDING') {
    result[`recovery:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.recovery);
  }

  if (dayFeatures.body !== 'PENDING') {
    result[`body:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.body);
  }

  if (dayFeatures.condition !== 'PENDING') {
    result[`condition:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.condition);
  }

  return result;
}
