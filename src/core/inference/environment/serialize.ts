/**
 * Serialize / deserialize environmental observation records for Prisma.
 */

import type { EnvironmentalObservationRecord } from '@/core/environment';

export function serializeEnvironmentalObservationRecord(
  record: EnvironmentalObservationRecord,
): Record<string, unknown> {
  return {
    ...record,
    observedAt: record.observedAt.toISOString(),
    receivedAt: record.receivedAt.toISOString(),
    ingestedAt: record.ingestedAt.toISOString(),
    intervalStart: record.intervalStart?.toISOString() ?? null,
    intervalEnd: record.intervalEnd?.toISOString() ?? null,
    providerSnapshot: {
      ...record.providerSnapshot,
      fetchedAt: record.providerSnapshot.fetchedAt.toISOString(),
    },
  };
}

export function deserializeEnvironmentalObservationRecord(
  raw: Record<string, unknown>,
): EnvironmentalObservationRecord {
  const providerSnapshot = raw.providerSnapshot as Record<string, unknown>;
  return {
    ...(raw as Omit<
      EnvironmentalObservationRecord,
      | 'observedAt'
      | 'receivedAt'
      | 'ingestedAt'
      | 'intervalStart'
      | 'intervalEnd'
      | 'providerSnapshot'
    >),
    observedAt: new Date(raw.observedAt as string),
    receivedAt: new Date(raw.receivedAt as string),
    ingestedAt: new Date(raw.ingestedAt as string),
    intervalStart: raw.intervalStart ? new Date(raw.intervalStart as string) : null,
    intervalEnd: raw.intervalEnd ? new Date(raw.intervalEnd as string) : null,
    providerSnapshot: {
      ...(providerSnapshot as Omit<
        EnvironmentalObservationRecord['providerSnapshot'],
        'fetchedAt'
      >),
      fetchedAt: new Date(providerSnapshot.fetchedAt as string),
    },
  };
}

export function serializeEnvironmentalTwinMeta(
  meta: import('./types').EnvironmentalStateMeta,
): Record<string, unknown> {
  return {
    ...meta,
    computedAt: meta.computedAt.toISOString(),
  };
}

export function deserializeEnvironmentalTwinMeta(
  raw: Record<string, unknown>,
): import('./types').EnvironmentalStateMeta {
  return {
    ...(raw as Omit<import('./types').EnvironmentalStateMeta, 'computedAt'>),
    computedAt: new Date(raw.computedAt as string),
  };
}
