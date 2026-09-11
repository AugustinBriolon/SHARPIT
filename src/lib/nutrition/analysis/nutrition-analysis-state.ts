/**
 * What the coach reading block shows, and whether to start a generation.
 *
 * Pure: the route supplies the stored row, the current facts hash and the
 * clock. Regeneration happens only when the facts changed; a claim dedupes
 * concurrent requests and a failed attempt is not retried for an hour.
 */

import type { NutritionCoachReadingView } from '@/core/presentation/nutrition-view-model';
import { nutritionDayReadingSchema, type NutritionDayReading } from './nutrition-analysis-schema';

/** A claim older than this is presumed dead (the generation takes ~10–20 s). */
export const NUTRITION_ANALYSIS_CLAIM_TTL_MS = 2 * 60_000;

/** After a failed attempt on the same facts, wait this long before retrying. */
export const NUTRITION_ANALYSIS_RETRY_AFTER_MS = 60 * 60_000;

export type StoredNutritionAnalysis = {
  status: 'FINAL' | 'PROVISIONAL';
  inputHash: string | null;
  analysis: unknown;
  generatedAt: Date | null;
  attemptHash: string | null;
  attemptedAt: Date | null;
};

export type NutritionReadingDecision = {
  view: NutritionCoachReadingView | null;
  shouldGenerate: boolean;
};

type ReadyReading = {
  reading: NutritionDayReading;
  status: 'FINAL' | 'PROVISIONAL';
  generatedAt: Date;
};

export function parseStoredReading(row: StoredNutritionAnalysis | null): ReadyReading | null {
  if (!row?.analysis || !row.generatedAt) {
    return null;
  }
  const parsed = nutritionDayReadingSchema.safeParse(row.analysis);
  return parsed.success
    ? { reading: parsed.data, status: row.status, generatedAt: row.generatedAt }
    : null;
}

function readyView(stored: ReadyReading, refreshing: boolean): NutritionCoachReadingView {
  return {
    state: 'ready',
    status: stored.status,
    refreshing,
    generatedAt: stored.generatedAt.toISOString(),
    verdict: stored.reading.verdict,
    findings: stored.reading.findings,
    action: stored.reading.action,
    flaggedEntries: stored.reading.flaggedEntries,
  };
}

type AttemptState = 'none' | 'in_flight' | 'failed_recently';

function attemptState(row: StoredNutritionAnalysis | null, hash: string, now: Date): AttemptState {
  if (!row?.attemptedAt || row.attemptHash !== hash) {
    return 'none';
  }
  const age = now.getTime() - row.attemptedAt.getTime();
  if (age < NUTRITION_ANALYSIS_CLAIM_TTL_MS) {
    return 'in_flight';
  }
  return age < NUTRITION_ANALYSIS_RETRY_AFTER_MS ? 'failed_recently' : 'none';
}

function staleDecision(
  stale: ReadyReading | null,
  attempt: AttemptState,
  canGenerate: boolean,
): NutritionReadingDecision {
  if (!canGenerate || attempt === 'failed_recently') {
    const fallback: NutritionCoachReadingView | null = canGenerate
      ? { state: 'unavailable' }
      : null;
    return { view: stale ? readyView(stale, false) : fallback, shouldGenerate: false };
  }
  return {
    view: stale ? readyView(stale, true) : { state: 'pending' },
    shouldGenerate: attempt === 'none',
  };
}

export function decideNutritionReading(input: {
  row: StoredNutritionAnalysis | null;
  currentHash: string;
  now: Date;
  isPastDay: boolean;
  canGenerate: boolean;
}): NutritionReadingDecision {
  if (!input.isPastDay) {
    return { view: { state: 'awaiting_day_end' }, shouldGenerate: false };
  }
  const stored = parseStoredReading(input.row);
  if (stored && input.row?.inputHash === input.currentHash) {
    return { view: readyView(stored, false), shouldGenerate: false };
  }
  return staleDecision(
    stored,
    attemptState(input.row, input.currentHash, input.now),
    input.canGenerate,
  );
}
