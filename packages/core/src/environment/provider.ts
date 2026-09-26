/**
 * ENVIRONMENTAL CONTEXT ENGINE — Provider Ports (environment-v1.1)
 */

import type { EnvironmentalProviderId, ExposureSetting, GeoLocation } from './types';
import type { ObservationRecordDraft } from './record';
import type { MergePolicy } from './merge';

export type EnvironmentalFetchRequest = {
  readonly athleteId: string;
  readonly location: GeoLocation;
  readonly from: Date;
  readonly to: Date;
  readonly trainingDayId?: string | null;
  readonly exposure?: ExposureSetting;
};

export type ProviderFailureReason =
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_LOCATION'
  | 'PROVIDER_DISABLED'
  | 'UNSUPPORTED_RANGE'
  | 'AUTHENTICATION_FAILED'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN';

export type EnvironmentalProviderResult =
  | {
      readonly status: 'success';
      readonly providerId: EnvironmentalProviderId;
      readonly payload: unknown;
      readonly fetchedAt: Date;
      readonly cacheHit: boolean;
      readonly providerVersion?: string | null;
    }
  | {
      readonly status: 'unavailable';
      readonly providerId: EnvironmentalProviderId;
      readonly reason: ProviderFailureReason;
      readonly message: string;
      readonly retryable: boolean;
    };

export type ProviderAvailabilityContext = {
  readonly location: GeoLocation;
  readonly from: Date;
  readonly to: Date;
};

export interface EnvironmentalProvider {
  readonly id: EnvironmentalProviderId;
  readonly priority: number;
  isAvailable(context: ProviderAvailabilityContext): boolean;
  fetch(request: EnvironmentalFetchRequest): Promise<EnvironmentalProviderResult>;
}

export type AdapterMeta = {
  readonly athleteId: string;
  readonly receivedAt: Date;
  readonly trainingDayId: string | null;
  readonly location: GeoLocation;
  readonly providerSnapshot: import('./types').ProviderSnapshot;
  readonly externalIdPrefix?: string;
};

export interface EnvironmentalProviderAdapter {
  readonly providerId: EnvironmentalProviderId;
  adapt(payload: unknown, meta: AdapterMeta): ObservationRecordDraft[];
}

export type ProviderAttempt = {
  readonly providerId: EnvironmentalProviderId;
  readonly status: 'success' | 'unavailable' | 'skipped';
  readonly reason?: ProviderFailureReason;
  readonly message?: string;
  readonly draftCount: number;
};

export type ProviderCollectionOutcome = {
  readonly bundles: readonly {
    readonly providerId: EnvironmentalProviderId;
    readonly priority: number;
    readonly drafts: readonly ObservationRecordDraft[];
  }[];
  readonly attempts: readonly ProviderAttempt[];
  readonly collectedAt: Date;
};

export type EnvironmentalIngestOutcome = {
  readonly records: readonly import('./types').EnvironmentalObservationRecord[];
  readonly attempts: readonly ProviderAttempt[];
  readonly primaryProviderId: EnvironmentalProviderId | null;
  readonly ingestedAt: Date;
};

export type ObservationIdFactory = () => string;

export type EnvironmentalProviderRegistry = {
  readonly providers: readonly EnvironmentalProvider[];
  readonly adapters: ReadonlyMap<EnvironmentalProviderId, EnvironmentalProviderAdapter>;
  readonly createObservationId: ObservationIdFactory;
  readonly mergePolicy?: MergePolicy;
};
