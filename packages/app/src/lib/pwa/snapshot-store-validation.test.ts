import { describe, expect, it } from 'vitest';
import {
  validatePersistedSnapshot,
  OFFLINE_SNAPSHOT_SCHEMA_VERSION,
  OFFLINE_SNAPSHOT_MAX_AGE_HOURS,
  type PersistedSnapshotEntry,
} from './snapshot-store-validation';

const NOW = new Date('2026-07-15T12:00:00.000Z');

function validEntry(overrides: Partial<PersistedSnapshotEntry> = {}): PersistedSnapshotEntry {
  return {
    schemaVersion: OFFLINE_SNAPSHOT_SCHEMA_VERSION,
    ownerKey: 'user_123',
    snapshot: { snapshotId: 'snap-1' } as never,
    generatedAt: NOW.toISOString(),
    freshnessComputedAt: NOW.toISOString(),
    cachedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('validatePersistedSnapshot', () => {
  it('accepts a well-formed, current, correctly-owned entry', () => {
    const result = validatePersistedSnapshot(validEntry(), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: true });
  });

  it('rejects malformed shapes: null, non-object, and missing required fields', () => {
    expect(validatePersistedSnapshot(null, { currentOwnerKey: 'user_123', now: NOW })).toEqual({
      valid: false,
      reason: 'MALFORMED',
    });
    expect(
      validatePersistedSnapshot('not an object', { currentOwnerKey: 'user_123', now: NOW }),
    ).toEqual({ valid: false, reason: 'MALFORMED' });
    expect(
      validatePersistedSnapshot({ schemaVersion: 1 }, { currentOwnerKey: 'user_123', now: NOW }),
    ).toEqual({ valid: false, reason: 'MALFORMED' });
  });

  it('rejects an unparseable cachedAt as malformed', () => {
    const result = validatePersistedSnapshot(validEntry({ cachedAt: 'not-a-date' }), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: 'MALFORMED' });
  });

  it('rejects a schema-version mismatch', () => {
    const result = validatePersistedSnapshot(validEntry({ schemaVersion: 999 }), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: 'SCHEMA_MISMATCH' });
  });

  it('rejects an ownership mismatch — a different signed-in athlete than the one who cached it', () => {
    const result = validatePersistedSnapshot(validEntry({ ownerKey: 'user_456' }), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: 'OWNERSHIP_MISMATCH' });
  });

  it('rejects an entry older than the max age', () => {
    const cachedAt = new Date(NOW.getTime() - (OFFLINE_SNAPSHOT_MAX_AGE_HOURS + 1) * 3_600_000);
    const result = validatePersistedSnapshot(validEntry({ cachedAt: cachedAt.toISOString() }), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: 'EXPIRED' });
  });

  it('accepts an entry exactly at the max-age boundary', () => {
    const cachedAt = new Date(NOW.getTime() - OFFLINE_SNAPSHOT_MAX_AGE_HOURS * 3_600_000);
    const result = validatePersistedSnapshot(validEntry({ cachedAt: cachedAt.toISOString() }), {
      currentOwnerKey: 'user_123',
      now: NOW,
    });
    expect(result).toEqual({ valid: true });
  });
});
