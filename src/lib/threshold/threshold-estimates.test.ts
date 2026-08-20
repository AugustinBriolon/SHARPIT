import { describe, expect, it } from 'vitest';
import {
  computeThresholdEstimates,
  filterRecordsForThresholdWindow,
  isMaterialFtpChange,
  isMaterialPaceChange,
  previewThresholdApply,
  THRESHOLD_RECENCY_WINDOW_DAYS,
} from './threshold-estimates';
import type { RecordsPayload } from '@/lib/training/records';

const NOW = new Date('2026-08-11T12:00:00.000Z');

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 86400000).toISOString();
}

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

describe('isMaterialFtpChange', () => {
  it('rejects a 2 W drift on a 210 W FTP (noise)', () => {
    expect(isMaterialFtpChange(210, 208)).toBe(false);
    expect(isMaterialFtpChange(210, 212)).toBe(false);
  });

  it('accepts a drop of ≥5 W and ≥3%', () => {
    // 3% of 210 = 6.3 → need ≥7 W effectively via max(5, 6.3)
    expect(isMaterialFtpChange(210, 203)).toBe(true);
    expect(isMaterialFtpChange(210, 200)).toBe(true);
  });
});

describe('isMaterialPaceChange', () => {
  it('rejects a 3 s/km drift', () => {
    expect(isMaterialPaceChange(277, 280)).toBe(false);
  });

  it('accepts a 5 s/km drift either direction', () => {
    expect(isMaterialPaceChange(277, 282)).toBe(true);
    expect(isMaterialPaceChange(277, 272)).toBe(true);
  });
});

describe('filterRecordsForThresholdWindow', () => {
  it('drops undated efforts and efforts older than the window', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      powerCurve: [
        {
          seconds: 1200,
          label: '20 min',
          watts: 229,
          activityId: 'a1',
          date: daysAgoIso(50),
          title: 'recent',
        },
        {
          seconds: 3600,
          label: '60 min',
          watts: 210,
          activityId: 'a2',
          date: daysAgoIso(200),
          title: 'stale',
        },
      ],
      bikeEfforts: [
        { seconds: 3600, watts: 214, date: daysAgoIso(100) },
        { seconds: 3600, watts: 250 }, // undated — excluded
      ],
      runBests: [
        {
          meters: 21097,
          label: 'Semi',
          entries: [
            {
              rank: 1,
              value: 5958,
              displayValue: '1:39:18',
              sublabel: '4:42/km',
              activityId: 'semi',
              date: daysAgoIso(520),
              title: 'Paris',
            },
          ],
        },
        {
          meters: 10000,
          label: '10 km',
          entries: [
            {
              rank: 1,
              value: 3060,
              displayValue: '51:00',
              sublabel: '5:06/km',
              activityId: '10k',
              date: daysAgoIso(69),
              title: 'Colombes',
            },
          ],
        },
      ],
      runEfforts: [
        { meters: 11100, seconds: 3360, date: daysAgoIso(69) },
        { meters: 15000, seconds: 5400 }, // undated
      ],
    };

    const filtered = filterRecordsForThresholdWindow(records, THRESHOLD_RECENCY_WINDOW_DAYS, NOW);

    expect(filtered.powerCurve.map((p) => p.activityId)).toEqual(['a1']);
    expect(filtered.bikeEfforts).toHaveLength(1);
    expect(filtered.bikeEfforts[0]?.watts).toBe(214);
    expect(filtered.runBests.map((c) => c.label)).toEqual(['10 km']);
    expect(filtered.runEfforts).toHaveLength(1);
  });
});

describe('computeThresholdEstimates (recency)', () => {
  it('does not let a 520-day-old half marathon set threshold pace', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      runBests: [
        {
          meters: 21097,
          label: 'Semi',
          entries: [
            {
              rank: 1,
              value: 5958,
              displayValue: '1:39:18',
              sublabel: '4:42/km',
              activityId: 'semi',
              date: daysAgoIso(520),
              title: 'Paris 2025',
            },
          ],
        },
        {
          meters: 11000,
          label: '11 km',
          entries: [
            {
              rank: 1,
              value: 3366,
              displayValue: '56:06',
              sublabel: '5:06/km',
              activityId: 'recent',
              date: daysAgoIso(69),
              title: 'Colombes',
            },
          ],
        },
      ],
      runEfforts: [{ meters: 11100, seconds: 3366, date: daysAgoIso(69) }],
    };

    const estimates = computeThresholdEstimates(records, { now: NOW });
    // Lifetime would be ~277 (4:37). Windowed must be materially slower.
    expect(estimates.runThresholdPaceSecPerKm).not.toBeNull();
    expect(estimates.runThresholdPaceSecPerKm!).toBeGreaterThanOrEqual(300);
    expect(estimates.windowDays).toBe(120);
  });
});

describe('previewThresholdApply', () => {
  it('suggests slowing a stale-fast threshold pace (bidirectional)', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      runBests: [
        {
          meters: 11000,
          label: '11 km',
          entries: [
            {
              rank: 1,
              value: 3366,
              displayValue: '56:06',
              sublabel: '5:06/km',
              activityId: 'recent',
              date: daysAgoIso(69),
              title: 'Colombes',
            },
          ],
        },
      ],
      runEfforts: [{ meters: 11100, seconds: 3366, date: daysAgoIso(69) }],
    };

    const preview = previewThresholdApply(
      records,
      { ftpW: 210, runThresholdPaceSecPerKm: 277, swimCssSecPer100m: null },
      { now: NOW },
    );

    const paceChange = preview.changes.find((c) => c.field === 'runThresholdPaceSecPerKm');
    expect(paceChange).toBeDefined();
    expect(paceChange!.direction).toBe('down');
    expect(paceChange!.from).toBe('4:37/km');
  });

  it('does not suggest a 2 W FTP tweak', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      powerCurve: [
        {
          seconds: 3600,
          label: '60 min',
          watts: 214, // 214 * 0.97 ≈ 207
          activityId: 'r',
          date: daysAgoIso(50),
          title: 'Zwift',
        },
      ],
    };

    const preview = previewThresholdApply(
      records,
      { ftpW: 210, runThresholdPaceSecPerKm: null, swimCssSecPer100m: null },
      { now: NOW },
    );

    expect(preview.changes.some((c) => c.field === 'ftpW')).toBe(false);
  });

  it('suggests a material FTP rise', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      powerCurve: [
        {
          seconds: 1200,
          label: '20 min',
          watts: 229,
          activityId: null,
          date: daysAgoIso(30),
          title: null,
        },
      ],
    };

    const preview = previewThresholdApply(
      records,
      { ftpW: 200, runThresholdPaceSecPerKm: null, swimCssSecPer100m: null },
      { now: NOW },
    );

    expect(preview.changes).toEqual([
      {
        field: 'ftpW',
        label: 'FTP vélo',
        from: '200 W',
        to: '218 W',
        direction: 'up',
      },
    ]);
  });

  it('suggests a material FTP drop after a cut', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      powerCurve: [
        {
          seconds: 3600,
          label: '60 min',
          watts: 180, // → FTP 175
          activityId: 'easy',
          date: daysAgoIso(20),
          title: 'recovery block',
        },
      ],
      bikeEfforts: [{ seconds: 4200, watts: 185, date: daysAgoIso(20) }],
    };

    const preview = previewThresholdApply(
      records,
      { ftpW: 210, runThresholdPaceSecPerKm: null, swimCssSecPer100m: null },
      { now: NOW },
    );

    const ftpChange = preview.changes.find((c) => c.field === 'ftpW');
    expect(ftpChange).toBeDefined();
    expect(ftpChange!.direction).toBe('down');
    expect(Number(ftpChange!.to.replace(' W', ''))).toBeLessThan(200);
  });

  it('fills an empty pace from the window, not from a lifetime PR outside it', () => {
    const records: RecordsPayload = {
      ...emptyRecords,
      runBests: [
        {
          meters: 21097,
          label: 'Semi',
          entries: [
            {
              rank: 1,
              value: 5958,
              displayValue: '1:39:18',
              sublabel: '4:42/km',
              activityId: 'semi',
              date: daysAgoIso(520),
              title: 'Paris',
            },
          ],
        },
        {
          meters: 11000,
          label: '11 km',
          entries: [
            {
              rank: 1,
              value: 3366,
              displayValue: '56:06',
              sublabel: '5:06/km',
              activityId: 'recent',
              date: daysAgoIso(69),
              title: 'Colombes',
            },
          ],
        },
      ],
    };

    const preview = previewThresholdApply(
      records,
      { ftpW: null, runThresholdPaceSecPerKm: null, swimCssSecPer100m: null },
      { now: NOW },
    );

    const paceChange = preview.changes.find((c) => c.field === 'runThresholdPaceSecPerKm');
    expect(paceChange).toBeDefined();
    expect(paceChange!.direction).toBe('set');
    expect(paceChange!.from).toBe('—');
    // Must not be the stale 4:37
    expect(paceChange!.to).not.toBe('4:37/km');
  });
});
