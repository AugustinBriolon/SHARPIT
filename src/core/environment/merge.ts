/**
 * Multi-provider observation merge.
 */

import type { EnvironmentalDimension, EnvironmentalProviderId, WeatherField } from './types';
import type { ObservationRecordDraft } from './record';
import { qualityRank } from './record';

export type ProviderObservationBundle = {
  readonly providerId: EnvironmentalProviderId;
  readonly priority: number;
  readonly drafts: readonly ObservationRecordDraft[];
};

export type MergeConflictStrategy = 'FIRST_WINS' | 'BEST_QUALITY' | 'MANUAL_OVERRIDE';

export type MergePolicy = {
  readonly conflictStrategy: MergeConflictStrategy;
  readonly fieldPriority: Partial<Record<WeatherField, readonly EnvironmentalProviderId[]>>;
};

export const DEFAULT_MERGE_POLICY: MergePolicy = {
  conflictStrategy: 'FIRST_WINS',
  fieldPriority: {
    airTemperatureC: ['manual', 'garmin-weather', 'race-dataset', 'open-meteo', 'openweather'],
    relativeHumidityPct: ['manual', 'open-meteo', 'openweather'],
    windSpeedMps: ['manual', 'garmin-weather', 'open-meteo', 'openweather'],
  },
};

function providerIndex(
  providerId: EnvironmentalProviderId,
  priorityList: readonly EnvironmentalProviderId[] | undefined,
): number {
  if (!priorityList) {
    return 999;
  }
  const idx = priorityList.indexOf(providerId);
  return idx === -1 ? 999 : idx;
}

function draftKey(draft: ObservationRecordDraft): string {
  if (draft.dimension === 'WEATHER') {
    return `WEATHER:${draft.observedAt.toISOString()}`;
  }
  return `${draft.dimension}:${draft.observedAt.toISOString()}:${draft.externalId ?? 'no-ext'}`;
}

function pickBetterDraft(
  a: ObservationRecordDraft,
  b: ObservationRecordDraft,
  policy: MergePolicy,
): ObservationRecordDraft {
  if (policy.conflictStrategy === 'FIRST_WINS') {
    return a;
  }

  const aRank = qualityRank(Object.values(a.fieldQuality)[0]?.quality ?? 'MISSING');
  const bRank = qualityRank(Object.values(b.fieldQuality)[0]?.quality ?? 'MISSING');
  return bRank > aRank ? b : a;
}

function hourBucket(at: Date): string {
  return at.toISOString().slice(0, 13);
}

function sortWeatherCandidates(group: ObservationRecordDraft[]): ObservationRecordDraft[] {
  return [...group].sort((a, b) => {
    if (a.providerId === 'manual') {
      return -1;
    }
    if (b.providerId === 'manual') {
      return 1;
    }
    return (a.providerId ?? '').localeCompare(b.providerId ?? '');
  });
}

function collectWeatherFields(candidates: ObservationRecordDraft[]): Set<WeatherField> {
  const allFields = new Set<WeatherField>();
  for (const candidate of candidates) {
    if (candidate.payload.dimension !== 'WEATHER') {
      continue;
    }
    for (const field of Object.keys(candidate.payload.data) as WeatherField[]) {
      if (candidate.payload.data[field] !== null) {
        allFields.add(field);
      }
    }
  }
  return allFields;
}

function shouldReplaceFieldWinner(
  winner: ObservationRecordDraft,
  candidate: ObservationRecordDraft,
  field: WeatherField,
  policy: MergePolicy,
): boolean {
  const currentPriority = providerIndex(
    winner.providerId ?? 'open-meteo',
    policy.fieldPriority[field],
  );
  const candidatePriority = providerIndex(
    candidate.providerId ?? 'open-meteo',
    policy.fieldPriority[field],
  );
  return candidatePriority < currentPriority;
}

function mergeWeatherCandidate(
  winner: ObservationRecordDraft,
  candidate: ObservationRecordDraft,
  field: WeatherField,
  policy: MergePolicy,
): ObservationRecordDraft {
  if (shouldReplaceFieldWinner(winner, candidate, field, policy)) {
    return candidate;
  }

  const currentPriority = providerIndex(
    winner.providerId ?? 'open-meteo',
    policy.fieldPriority[field],
  );
  const candidatePriority = providerIndex(
    candidate.providerId ?? 'open-meteo',
    policy.fieldPriority[field],
  );
  if (candidatePriority === currentPriority) {
    return pickBetterDraft(winner, candidate, policy);
  }

  return winner;
}

function pickFieldWinner(
  field: WeatherField,
  sorted: ObservationRecordDraft[],
  policy: MergePolicy,
): { value: number | null; quality: ObservationRecordDraft['fieldQuality'][WeatherField] } | null {
  let winner: ObservationRecordDraft | null = null;

  for (const candidate of sorted) {
    if (candidate.payload.dimension !== 'WEATHER') {
      continue;
    }

    const candidateValue = candidate.payload.data[field];
    if (candidateValue === null) {
      continue;
    }

    winner = winner === null ? candidate : mergeWeatherCandidate(winner, candidate, field, policy);
  }

  if (winner === null || winner.payload.dimension !== 'WEATHER') {
    return null;
  }

  return {
    value: winner.payload.data[field],
    quality: winner.fieldQuality[field],
  };
}

function mergeWeatherGroup(
  group: ObservationRecordDraft[],
  policy: MergePolicy,
): ObservationRecordDraft {
  const sorted = sortWeatherCandidates(group);
  const [base] = sorted;
  const data: Record<string, number | null | undefined> = {};
  const fieldQuality: ObservationRecordDraft['fieldQuality'] = {};

  for (const field of collectWeatherFields(sorted)) {
    const winner = pickFieldWinner(field, sorted, policy);
    if (!winner) {
      continue;
    }
    data[field] = winner.value;
    fieldQuality[field] = winner.quality;
  }

  return {
    ...base,
    payload: { dimension: 'WEATHER', data },
    fieldQuality,
    providerId:
      sorted.find((draft) => draft.providerId === 'manual')?.providerId ?? base.providerId,
  };
}

function mergeWeatherDrafts(
  drafts: readonly ObservationRecordDraft[],
  policy: MergePolicy,
): ObservationRecordDraft[] {
  const byTime = new Map<string, ObservationRecordDraft[]>();
  for (const draft of drafts) {
    if (draft.dimension !== 'WEATHER' || draft.payload.dimension !== 'WEATHER') {
      continue;
    }
    const key = hourBucket(draft.observedAt);
    const list = byTime.get(key) ?? [];
    list.push(draft);
    byTime.set(key, list);
  }

  const merged: ObservationRecordDraft[] = [];
  for (const [, group] of byTime) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }
    merged.push(mergeWeatherGroup(group, policy));
  }

  return merged;
}

export function mergeObservationDrafts(
  bundles: readonly ProviderObservationBundle[],
  policy: MergePolicy = DEFAULT_MERGE_POLICY,
): ObservationRecordDraft[] {
  const allDrafts = bundles.flatMap((b) => [...b.drafts]);
  if (allDrafts.length === 0) {
    return [];
  }

  const weatherDrafts = allDrafts.filter((d) => d.dimension === 'WEATHER');
  const nonWeatherDrafts = allDrafts.filter((d) => d.dimension !== 'WEATHER');

  const weatherMerged = mergeWeatherDrafts(weatherDrafts, policy);

  const deduped = new Map<string, ObservationRecordDraft>();
  for (const draft of nonWeatherDrafts) {
    const key = draftKey(draft);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, draft);
    } else {
      deduped.set(key, pickBetterDraft(existing, draft, policy));
    }
  }

  return [...weatherMerged, ...deduped.values()].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
}

export function dimensionStubs(): Record<
  Exclude<EnvironmentalDimension, 'WEATHER'>,
  ObservationRecordDraft | null
> {
  return {
    TERRAIN: null,
    ALTITUDE: null,
    AIR_QUALITY: null,
  };
}
