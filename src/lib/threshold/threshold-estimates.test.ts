import { describe, expect, it } from 'vitest';
import { previewThresholdApply } from './threshold-estimates';
import type { RecordsPayload } from '@/lib/training/records';

const emptyRecords: RecordsPayload = {
  prs: { run: [], bike: [], swim: [] },
  powerCurve: [],
  runBests: [],
  runEfforts: [],
  bikeEfforts: [],
  streamsAnalyzed: 0,
  totalActivities: 0,
  generatedAt: null,
};

describe('previewThresholdApply', () => {
  it('ne suggère pas de ralentir une allure seuil déjà renseignée', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      runBests: [
        {
          meters: 10000,
          label: '10 km',
          entries: [
            {
              rank: 1,
              value: 2781,
              displayValue: '46:21',
              sublabel: '4:38/km',
              activityId: null,
              date: '2026-01-01',
              title: null,
            },
          ],
        },
        {
          meters: 21097,
          label: 'Semi',
          entries: [
            {
              rank: 1,
              value: 5958,
              displayValue: '1:39:18',
              sublabel: '4:42/km',
              activityId: null,
              date: '2026-01-01',
              title: null,
            },
          ],
        },
      ],
      runEfforts: [{ meters: 15064.88, seconds: 4793 }],
    };

    const preview = previewThresholdApply(records, {
      ftpW: 200,
      runThresholdPaceSecPerKm: 257,
    } as { ftpW: number; runThresholdPaceSecPerKm: number });

    expect(preview.estimates.runThresholdPaceSecPerKm).toBe(277);
    expect(preview.changes.some((c) => c.field === 'runThresholdPaceSecPerKm')).toBe(false);
  });

  it('suggère une hausse de FTP quand les records montrent mieux', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      powerCurve: [
        {
          seconds: 1200,
          label: '20 min',
          watts: 229,
          activityId: null,
          date: '2026-01-01',
          title: null,
        },
      ],
    };

    const preview = previewThresholdApply(records, {
      ftpW: 200,
      runThresholdPaceSecPerKm: null,
    } as { ftpW: number; runThresholdPaceSecPerKm: null });

    expect(preview.changes).toEqual([
      {
        field: 'ftpW',
        label: 'FTP vélo',
        from: '200 W',
        to: '218 W',
      },
    ]);
  });
});
