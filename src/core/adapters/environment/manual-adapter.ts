/**
 * ADAPTER — Manual environmental entry → ObservationRecordDraft
 */

import type { EnvironmentalProviderAdapter, AdapterMeta } from '@/core/environment/provider';
import type { ExposureSetting, WeatherMeasurements } from '@/core/environment/types';
import { weatherFieldQuality } from '@/core/environment/quality';
import type { ObservationRecordDraft } from '@/core/environment/record';

export type ManualEnvironmentalPayload = {
  observedAt: string | Date;
  exposure?: ExposureSetting;
  measurements: WeatherMeasurements;
  temporalScope?: ObservationRecordDraft['temporalScope'];
  intervalStart?: string | Date | null;
  intervalEnd?: string | Date | null;
  externalId?: string | null;
};

function isManualPayload(payload: unknown): payload is ManualEnvironmentalPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as ManualEnvironmentalPayload;
  return p.observedAt != null && typeof p.measurements === 'object';
}

export const manualEnvironmentalAdapter: EnvironmentalProviderAdapter = {
  providerId: 'manual',

  adapt(payload: unknown, meta: AdapterMeta): ObservationRecordDraft[] {
    if (!isManualPayload(payload)) return [];

    const observedAt =
      payload.observedAt instanceof Date ? payload.observedAt : new Date(payload.observedAt);

    return [
      {
        athleteId: meta.athleteId,
        dimension: 'WEATHER',
        payload: { dimension: 'WEATHER', data: payload.measurements },
        observedAt,
        receivedAt: meta.receivedAt,
        trainingDayId: meta.trainingDayId,
        temporalScope: payload.temporalScope ?? 'POINT',
        intervalStart: payload.intervalStart ? new Date(payload.intervalStart) : null,
        intervalEnd: payload.intervalEnd ? new Date(payload.intervalEnd) : null,
        exposure: payload.exposure ?? 'UNKNOWN',
        location: meta.location,
        source: 'MANUAL',
        providerId: 'manual',
        externalId: payload.externalId ?? null,
        providerSnapshot: meta.providerSnapshot,
        fieldQuality: weatherFieldQuality(payload.measurements, 'manual'),
      },
    ];
  },
};
