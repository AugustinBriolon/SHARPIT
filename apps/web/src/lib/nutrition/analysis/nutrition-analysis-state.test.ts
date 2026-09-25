import { describe, expect, it } from 'vitest';
import {
  decideNutritionReading,
  NUTRITION_ANALYSIS_CLAIM_TTL_MS,
  NUTRITION_ANALYSIS_RETRY_AFTER_MS,
  type StoredNutritionAnalysis,
} from './nutrition-analysis-state';

const NOW = new Date('2026-09-11T08:00:00.000Z');

const READING = {
  verdict: { headline: 'Bonne journée de carburant', tone: 'on_track' },
  findings: [{ job: 'fuel', text: '5,6 g/kg de glucides pour une sortie modérée.' }],
  action: { text: 'Garde ce petit-déjeuner avant la séance de demain.' },
  flaggedEntries: [],
};

function row(overrides: Partial<StoredNutritionAnalysis> = {}): StoredNutritionAnalysis {
  return {
    status: 'FINAL',
    inputHash: 'h1',
    analysis: READING,
    generatedAt: new Date('2026-09-11T07:00:00.000Z'),
    attemptHash: 'h1',
    attemptedAt: new Date('2026-09-11T06:59:00.000Z'),
    ...overrides,
  };
}

function decide(
  stored: StoredNutritionAnalysis | null,
  extra: { hash?: string; canGenerate?: boolean; isPastDay?: boolean } = {},
) {
  return decideNutritionReading({
    row: stored,
    currentHash: extra.hash ?? 'h1',
    now: NOW,
    isPastDay: extra.isPastDay ?? true,
    canGenerate: extra.canGenerate ?? true,
  });
}

function ago(ms: number) {
  return new Date(NOW.getTime() - ms);
}

describe('decideNutritionReading', () => {
  it('waits for the end of the day before reading it', () => {
    expect(decide(null, { isPastDay: false })).toEqual({
      view: { state: 'awaiting_day_end' },
      shouldGenerate: false,
    });
  });

  it('serves a reading generated from the same facts', () => {
    const decision = decide(row());
    expect(decision.shouldGenerate).toBe(false);
    expect(decision.view).toMatchObject({ state: 'ready', refreshing: false, status: 'FINAL' });
  });

  it('generates when nothing is stored yet', () => {
    expect(decide(null)).toEqual({ view: { state: 'pending' }, shouldGenerate: true });
  });

  it('keeps the old reading visible while the changed facts regenerate', () => {
    const decision = decide(row(), { hash: 'h2' });
    expect(decision.shouldGenerate).toBe(true);
    expect(decision.view).toMatchObject({ state: 'ready', refreshing: true });
  });

  it('does not start a second generation while one is in flight', () => {
    const inFlight = row({
      inputHash: null,
      analysis: null,
      generatedAt: null,
      attemptHash: 'h2',
      attemptedAt: ago(10_000),
    });
    expect(decide(inFlight, { hash: 'h2' })).toEqual({
      view: { state: 'pending' },
      shouldGenerate: false,
    });
  });

  it('backs off after a failed attempt, then retries', () => {
    const failed = row({
      inputHash: null,
      analysis: null,
      generatedAt: null,
      attemptHash: 'h2',
      attemptedAt: ago(NUTRITION_ANALYSIS_CLAIM_TTL_MS + 1),
    });
    expect(decide(failed, { hash: 'h2' })).toEqual({
      view: { state: 'unavailable' },
      shouldGenerate: false,
    });

    const old = { ...failed, attemptedAt: ago(NUTRITION_ANALYSIS_RETRY_AFTER_MS + 1) };
    expect(decide(old, { hash: 'h2' }).shouldGenerate).toBe(true);
  });

  it('never generates when the coach cannot run, but still shows what exists', () => {
    expect(decide(null, { canGenerate: false })).toEqual({ view: null, shouldGenerate: false });
    expect(decide(row(), { hash: 'h2', canGenerate: false }).view).toMatchObject({
      state: 'ready',
      refreshing: false,
    });
  });

  it('treats a stored reading that no longer matches the schema as missing', () => {
    expect(decide(row({ analysis: { headline: 'old shape' } }))).toEqual({
      view: { state: 'pending' },
      shouldGenerate: true,
    });
  });
});
