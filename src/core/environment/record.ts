/**
 * Immutable environmental observation records.
 */

import { createHash } from 'node:crypto';
import {
  ENVIRONMENTAL_CONTEXT_ENGINE_VERSION,
  type DimensionPayload,
  type EnvironmentalEvidenceQuality,
  type EnvironmentalObservationRecord,
  type EnvironmentalProviderId,
  type ExposureSetting,
  type FieldQuality,
  type GeoLocation,
  type ProviderSnapshot,
} from './types';
import { aggregateFieldQuality, confidenceFromFieldQualities } from './quality';

export type ObservationRecordDraft = {
  readonly athleteId: string;
  readonly dimension: EnvironmentalObservationRecord['dimension'];
  readonly payload: DimensionPayload;
  readonly observedAt: Date;
  readonly receivedAt: Date;
  readonly trainingDayId: string | null;
  readonly temporalScope: EnvironmentalObservationRecord['temporalScope'];
  readonly intervalStart: Date | null;
  readonly intervalEnd: Date | null;
  readonly exposure: ExposureSetting;
  readonly location: GeoLocation;
  readonly source: EnvironmentalObservationRecord['source'];
  readonly providerId: EnvironmentalProviderId | null;
  readonly externalId: string | null;
  readonly providerSnapshot: ProviderSnapshot;
  readonly fieldQuality: Partial<Record<string, FieldQuality>>;
};

export function computeProviderPayloadHash(payload: unknown): string {
  const normalized = JSON.stringify(payload, (_key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  });
  return createHash('sha256').update(normalized).digest('hex');
}

export function createProviderSnapshot(input: {
  providerId: EnvironmentalProviderId;
  providerVersion?: string | null;
  payload: unknown;
  fetchedAt: Date;
}): ProviderSnapshot {
  return Object.freeze({
    providerId: input.providerId,
    providerVersion: input.providerVersion ?? null,
    payloadHash: computeProviderPayloadHash(input.payload),
    fetchedAt: input.fetchedAt,
  });
}

export function ingestObservationRecord(
  draft: ObservationRecordDraft,
  id: string,
  ingestedAt: Date = new Date(),
): EnvironmentalObservationRecord {
  const aggregateQuality = aggregateFieldQuality(draft.fieldQuality);
  const confidence = confidenceFromFieldQualities(draft.fieldQuality);

  const record: EnvironmentalObservationRecord = {
    id,
    recordVersion: ENVIRONMENTAL_CONTEXT_ENGINE_VERSION,
    athleteId: draft.athleteId,
    dimension: draft.dimension,
    payload: draft.payload,
    observedAt: draft.observedAt,
    receivedAt: draft.receivedAt,
    ingestedAt,
    trainingDayId: draft.trainingDayId,
    temporalScope: draft.temporalScope,
    intervalStart: draft.intervalStart,
    intervalEnd: draft.intervalEnd,
    exposure: draft.exposure,
    location: draft.location,
    source: draft.source,
    providerId: draft.providerId,
    externalId: draft.externalId,
    providerSnapshot: draft.providerSnapshot,
    fieldQuality: draft.fieldQuality,
    aggregateQuality,
    confidence,
    supersededBy: null,
  };

  return Object.freeze(record);
}

export function supersedeObservationRecord(
  previous: EnvironmentalObservationRecord,
  replacement: EnvironmentalObservationRecord,
): EnvironmentalObservationRecord {
  return Object.freeze({
    ...previous,
    supersededBy: replacement.id,
  });
}

export function isRecordActive(record: EnvironmentalObservationRecord): boolean {
  return record.supersededBy == null;
}

export function extractWeatherFromRecords(
  records: readonly EnvironmentalObservationRecord[],
): import('./types').WeatherMeasurements {
  const merged: Record<string, number | null | undefined> = {};

  for (const record of records) {
    if (record.dimension !== 'WEATHER' || record.payload.dimension !== 'WEATHER') continue;
    if (!isRecordActive(record)) continue;
    for (const [key, value] of Object.entries(record.payload.data)) {
      if (value == null) continue;
      const current = merged[key];
      if (current == null) merged[key] = value;
      else if (typeof current === 'number') merged[key] = (current + value) / 2;
    }
  }

  return merged as import('./types').WeatherMeasurements;
}

export function qualityRank(quality: EnvironmentalEvidenceQuality): number {
  switch (quality) {
    case 'EXACT':
      return 4;
    case 'INTERPOLATED':
      return 3;
    case 'ESTIMATED':
      return 2;
    case 'MISSING':
      return 0;
  }
}
