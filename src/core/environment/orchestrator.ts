/**
 * Provider collect + merge + immutable ingest orchestration.
 */

import { createProviderSnapshot, ingestObservationRecord } from './record';
import { DEFAULT_MERGE_POLICY, mergeObservationDrafts } from './merge';
import type {
  EnvironmentalFetchRequest,
  EnvironmentalIngestOutcome,
  EnvironmentalProvider,
  EnvironmentalProviderRegistry,
  ProviderAttempt,
  ProviderCollectionOutcome,
} from './provider';
import type { EnvironmentalObservationRecord, EnvironmentalProviderId } from './types';
import type { ObservationRecordDraft } from './record';

function sortProviders(providers: readonly EnvironmentalProvider[]): EnvironmentalProvider[] {
  return [...providers].sort((a, b) => a.priority - b.priority);
}

export async function collectEnvironmentalObservationDrafts(
  registry: Pick<EnvironmentalProviderRegistry, 'providers' | 'adapters'>,
  request: EnvironmentalFetchRequest,
): Promise<ProviderCollectionOutcome> {
  const attempts: ProviderAttempt[] = [];
  const bundles: Array<{
    providerId: import('./types').EnvironmentalProviderId;
    priority: number;
    drafts: import('./record').ObservationRecordDraft[];
  }> = [];
  const collectedAt = new Date();

  for (const provider of sortProviders(registry.providers)) {
    const context = {
      location: request.location,
      from: request.from,
      to: request.to,
    };

    if (!provider.isAvailable(context)) {
      attempts.push({
        providerId: provider.id,
        status: 'skipped',
        message: 'Provider not available for this context',
        draftCount: 0,
      });
      continue;
    }

    let result;
    try {
      result = await provider.fetch(request);
    } catch (error) {
      attempts.push({
        providerId: provider.id,
        status: 'unavailable',
        reason: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Provider fetch failed',
        draftCount: 0,
      });
      continue;
    }

    if (result.status === 'unavailable') {
      attempts.push({
        providerId: provider.id,
        status: 'unavailable',
        reason: result.reason,
        message: result.message,
        draftCount: 0,
      });
      continue;
    }

    const adapter = registry.adapters.get(provider.id);
    if (!adapter) {
      attempts.push({
        providerId: provider.id,
        status: 'unavailable',
        reason: 'UNKNOWN',
        message: `No adapter registered for provider ${provider.id}`,
        draftCount: 0,
      });
      continue;
    }

    const providerSnapshot = createProviderSnapshot({
      providerId: provider.id,
      providerVersion: result.providerVersion ?? null,
      payload: result.payload,
      fetchedAt: result.fetchedAt,
    });

    const drafts = adapter.adapt(result.payload, {
      athleteId: request.athleteId,
      receivedAt: result.fetchedAt,
      trainingDayId: request.trainingDayId ?? null,
      location: request.location,
      providerSnapshot,
    });

    if (drafts.length > 0) {
      bundles.push({
        providerId: provider.id,
        priority: provider.priority,
        drafts,
      });
    }

    attempts.push({
      providerId: provider.id,
      status: 'success',
      draftCount: drafts.length,
    });
  }

  return { bundles, attempts, collectedAt };
}

export function ingestEnvironmentalRecords(
  drafts: readonly ObservationRecordDraft[],
  createObservationId: () => string,
  ingestedAt: Date = new Date(),
): EnvironmentalObservationRecord[] {
  return drafts.map((draft) => ingestObservationRecord(draft, createObservationId(), ingestedAt));
}

export async function fetchAndIngestEnvironmentalRecords(
  registry: EnvironmentalProviderRegistry,
  request: EnvironmentalFetchRequest,
): Promise<EnvironmentalIngestOutcome> {
  const collection = await collectEnvironmentalObservationDrafts(registry, request);
  const mergePolicy = registry.mergePolicy ?? DEFAULT_MERGE_POLICY;
  const mergedDrafts = mergeObservationDrafts(collection.bundles, mergePolicy);
  const ingestedAt = new Date();
  const records = ingestEnvironmentalRecords(
    mergedDrafts,
    registry.createObservationId,
    ingestedAt,
  );

  const primaryProviderId: EnvironmentalProviderId | null =
    collection.bundles.find((b) => b.drafts.length > 0)?.providerId ?? null;

  return {
    records,
    attempts: collection.attempts,
    primaryProviderId,
    ingestedAt,
  };
}
