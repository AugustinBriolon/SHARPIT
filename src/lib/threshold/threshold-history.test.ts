import { describe, expect, it } from 'vitest';
import { dedupeThresholdHistory, describeThresholdChanges } from './threshold-history';

describe('threshold-history', () => {
  it('dedupes consecutive identical snapshots', () => {
    const history = [
      {
        id: '3',
        createdAt: '2026-07-07',
        source: 'estimated',
        ftpW: 207,
        runThresholdPaceSecPerKm: 318,
      },
      {
        id: '2',
        createdAt: '2026-07-06',
        source: 'estimated',
        ftpW: 207,
        runThresholdPaceSecPerKm: 318,
      },
      {
        id: '1',
        createdAt: '2026-07-05',
        source: 'estimated',
        ftpW: 200,
        runThresholdPaceSecPerKm: 318,
      },
    ];

    expect(dedupeThresholdHistory(history)).toHaveLength(2);
    expect(dedupeThresholdHistory(history)[0]?.id).toBe('3');
    expect(dedupeThresholdHistory(history)[1]?.id).toBe('1');
  });

  it('describes value changes between snapshots', () => {
    const newer = {
      id: '2',
      createdAt: '2026-07-07',
      source: 'estimated',
      ftpW: 207,
      runThresholdPaceSecPerKm: 318,
    };
    const older = {
      id: '1',
      createdAt: '2026-07-05',
      source: 'estimated',
      ftpW: 200,
      runThresholdPaceSecPerKm: 318,
    };

    expect(describeThresholdChanges(newer, older)).toEqual(['FTP 200 → 207 W']);
  });
});
