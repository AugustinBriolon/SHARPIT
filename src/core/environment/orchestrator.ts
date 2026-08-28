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

function unavailableProviderOutcome(
  provider: EnvironmentalProvider,
  reason: ProviderAttempt['reason'],
  message: string,
): {
  status: 'unavailable';
  attempt: ProviderAttempt;
} {
  return {
    status: 'unavailable',
    attempt: {
      providerId: provider.id,
      status: 'unavailable',
      reason,
      message,
      draftCount: 0,
    },
  };
}

function skippedProviderOutcome(provider: EnvironmentalProvider): {
  status: 'skipped';
  attempt: ProviderAttempt;
} {
  return {
    status: 'skipped',
    attempt: {
      providerId: provider.id,
      status: 'skipped',
      message: 'Provider not available for this context',
      draftCount: 0,
    },
  };
}

function buildProviderSuccessOutcome(
  provider: EnvironmentalProvider,
  drafts: ObservationRecordDraft[],
): {
  status: 'success';
  attempt: ProviderAttempt;
  bundle: {
    providerId: EnvironmentalProviderId;
    priority: number;
    drafts: ObservationRecordDraft[];
  } | null;
} {
  const bundle =
    drafts.length > 0 ? { providerId: provider.id, priority: provider.priority, drafts } : null;

  return {
    status: 'success',
    attempt: {
      providerId: provider.id,
      status: 'success',
      draftCount: drafts.length,
    },
    bundle,
  };
}

async function fetchProviderDrafts(
  provider: EnvironmentalProvider,
  registry: Pick<EnvironmentalProviderRegistry, 'adapters'>,
  request: EnvironmentalFetchRequest,
): Promise<
  | { status: 'skipped'; attempt: ProviderAttempt }
  | { status: 'unavailable'; attempt: ProviderAttempt }
  | {
      status: 'success';
      attempt: ProviderAttempt;
      bundle: {
        providerId: EnvironmentalProviderId;
        priority: number;
        drafts: ObservationRecordDraft[];
      } | null;
    }
> {
  const context = {
    location: request.location,
    from: request.from,
    to: request.to,
  };

  if (!provider.isAvailable(context)) {
    return skippedProviderOutcome(provider);
  }

  let result;
  try {
    result = await provider.fetch(request);
  } catch (error) {
    return unavailableProviderOutcome(
      provider,
      'UNKNOWN',
      error instanceof Error ? error.message : 'Provider fetch failed',
    );
  }

  if (result.status === 'unavailable') {
    return unavailableProviderOutcome(provider, result.reason, result.message);
  }

  const adapter = registry.adapters.get(provider.id);
  if (!adapter) {
    return unavailableProviderOutcome(
      provider,
      'UNKNOWN',
      `No adapter registered for provider ${provider.id}`,
    );
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

  return buildProviderSuccessOutcome(provider, drafts);
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
    const outcome = await fetchProviderDrafts(provider, registry, request);
    attempts.push(outcome.attempt);
    if (outcome.status === 'success' && outcome.bundle) {
      bundles.push(outcome.bundle);
    }
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
