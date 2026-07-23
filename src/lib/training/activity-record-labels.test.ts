import { describe, expect, it } from 'vitest';

import type { RecordEntry, RecordsPayload } from '@/lib/training/records';
import { buildActivityRecordLabels } from './activity-record-labels';

function entry(rank: number, activityId: string | null): RecordEntry {
  return {
    rank,
    value: 1,
    displayValue: '1',
    sublabel: null,
    activityId,
    date: '2026-07-01T00:00:00.000Z',
    title: null,
  };
}

function payload(overrides: Partial<RecordsPayload> = {}): RecordsPayload {
  return {
    prs: { run: [], bike: [], swim: [] },
    powerCurve: [],
    runBests: [],
    runEfforts: [],
    bikeEfforts: [],
    streamsAnalyzed: 0,
    totalActivities: 0,
    generatedAt: null,
    ...overrides,
  };
}

describe('buildActivityRecordLabels', () => {
  it('returns an empty map without records', () => {
    expect(buildActivityRecordLabels(undefined).size).toBe(0);
    expect(buildActivityRecordLabels(null).size).toBe(0);
  });

  it('labels rank-1 run bests with the distance ("Record 5 km")', () => {
    const labels = buildActivityRecordLabels(
      payload({
        runBests: [{ meters: 5000, label: '5 km', entries: [entry(1, 'a1'), entry(2, 'a2')] }],
      }),
    );
    expect(labels.get('a1')).toBe('Record 5 km');
    expect(labels.has('a2')).toBe(false);
  });

  it('uses compact labels for PR categories and ignores non-leaders', () => {
    const labels = buildActivityRecordLabels(
      payload({
        prs: {
          run: [{ key: 'run-pace', label: 'Meilleure allure moyenne', entries: [entry(1, 'a3')] }],
          bike: [
            { key: 'bike-np', label: 'Meilleure puissance normalisée', entries: [entry(1, 'a4')] },
          ],
          swim: [],
        },
      }),
    );
    expect(labels.get('a3')).toBe('Record allure');
    expect(labels.get('a4')).toBe('Record NP');
  });

  it('keeps one badge per activity — distance reference wins over PR', () => {
    const labels = buildActivityRecordLabels(
      payload({
        runBests: [{ meters: 10000, label: '10 km', entries: [entry(1, 'a5')] }],
        prs: {
          run: [{ key: 'run-pace', label: 'Meilleure allure moyenne', entries: [entry(1, 'a5')] }],
          bike: [],
          swim: [],
        },
      }),
    );
    expect(labels.get('a5')).toBe('Record 10 km');
    expect(labels.size).toBe(1);
  });

  it('labels power-curve leaders with the duration', () => {
    const labels = buildActivityRecordLabels(
      payload({
        powerCurve: [
          {
            seconds: 1200,
            label: '20 min',
            watts: 280,
            activityId: 'a6',
            date: '2026-07-01T00:00:00.000Z',
            title: null,
          },
        ],
      }),
    );
    expect(labels.get('a6')).toBe('Record 20 min');
  });
});
