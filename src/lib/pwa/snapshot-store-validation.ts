/**
 * Offline Snapshot storage contract and validation — pure, no IndexedDB here.
 *
 * The persisted record mirrors the canonical `AthleteSnapshot` (see
 * src/core/athlete-state/snapshot.ts) verbatim — nothing raw, nothing beyond
 * what the existing snapshot endpoint already serves. See ADR-008.
 */

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { isSet } from '@/lib/util/value';

/** Bump when AthleteSnapshot's shape changes incompatibly with older persisted entries. */
export const OFFLINE_SNAPSHOT_SCHEMA_VERSION = 1;

/** A persisted Snapshot older than this is never shown — daily-cadence artifact,
 * generous enough to survive a connectivity-free weekend, never mistaken for current. */
export const OFFLINE_SNAPSHOT_MAX_AGE_HOURS = 48;

export type PersistedSnapshotEntry = {
  readonly schemaVersion: number;
  /** Clerk user.id — client-side ownership check only, not a security boundary. */
  readonly ownerKey: string;
  readonly snapshot: AthleteSnapshot;
  readonly generatedAt: string;
  readonly freshnessComputedAt: string;
  /** When this client wrote the record — the basis for expiry, not `generatedAt`. */
  readonly cachedAt: string;
};

export type SnapshotInvalidReason =
  'MALFORMED' | 'SCHEMA_MISMATCH' | 'OWNERSHIP_MISMATCH' | 'EXPIRED';

export type SnapshotValidationResult =
  { readonly valid: true } | { readonly valid: false; readonly reason: SnapshotInvalidReason };

function isPersistedEntryRecord(entry: unknown): entry is Record<string, unknown> {
  return typeof entry === 'object' && isSet(entry);
}

function hasPersistedEntryShape(entry: unknown): entry is PersistedSnapshotEntry {
  if (!isPersistedEntryRecord(entry)) {
    return false;
  }
  return (
    typeof entry.schemaVersion === 'number' &&
    typeof entry.ownerKey === 'string' &&
    typeof entry.snapshot === 'object' &&
    isSet(entry.snapshot) &&
    typeof entry.generatedAt === 'string' &&
    typeof entry.freshnessComputedAt === 'string' &&
    typeof entry.cachedAt === 'string'
  );
}

export function validatePersistedSnapshot(
  entry: unknown,
  context: { readonly currentOwnerKey: string; readonly now: Date },
): SnapshotValidationResult {
  if (!hasPersistedEntryShape(entry)) {
    return { valid: false, reason: 'MALFORMED' };
  }
  if (entry.schemaVersion !== OFFLINE_SNAPSHOT_SCHEMA_VERSION) {
    return { valid: false, reason: 'SCHEMA_MISMATCH' };
  }
  if (entry.ownerKey !== context.currentOwnerKey) {
    return { valid: false, reason: 'OWNERSHIP_MISMATCH' };
  }

  const cachedAtMs = new Date(entry.cachedAt).getTime();
  if (!Number.isFinite(cachedAtMs)) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const ageHours = (context.now.getTime() - cachedAtMs) / 3_600_000;
  if (ageHours > OFFLINE_SNAPSHOT_MAX_AGE_HOURS) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true };
}
