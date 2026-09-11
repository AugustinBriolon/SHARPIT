import { describe, expect, it } from 'vitest';
import {
  buildDataDaysLookup,
  dataDaysChunkRanges,
  mergeDayRanges,
} from '@/lib/presentation/data-days/data-days-chunks';

const TODAY = new Date(2026, 8, 11);

describe('dataDaysChunkRanges', () => {
  it('covers the last 28 days with a single chunk ending today', () => {
    expect(dataDaysChunkRanges(new Date(2026, 7, 15), TODAY, TODAY)).toEqual([
      { from: '2026-08-15', to: '2026-09-11' },
    ]);
  });

  it('adds one older chunk per 28 days, newest first', () => {
    expect(dataDaysChunkRanges(new Date(2026, 7, 14), TODAY, TODAY)).toEqual([
      { from: '2026-08-15', to: '2026-09-11' },
      { from: '2026-07-18', to: '2026-08-14' },
    ]);
  });

  it('maps days after the anchor to the newest chunk', () => {
    expect(dataDaysChunkRanges(new Date(2026, 8, 1), new Date(2026, 9, 4), TODAY)).toEqual([
      { from: '2026-08-15', to: '2026-09-11' },
    ]);
  });
});

describe('mergeDayRanges', () => {
  it('drops duplicate ranges while keeping order', () => {
    const newest = { from: '2026-08-15', to: '2026-09-11' };
    const older = { from: '2026-07-18', to: '2026-08-14' };

    expect(mergeDayRanges([newest], [older, newest])).toEqual([newest, older]);
  });
});

describe('buildDataDaysLookup', () => {
  const ranges = [
    { from: '2026-08-15', to: '2026-09-11' },
    { from: '2026-07-18', to: '2026-08-14' },
  ];

  it('reports data, empty and unknown days', () => {
    const lookup = buildDataDaysLookup(ranges, [['2026-09-10'], undefined]);

    expect(lookup.status('2026-09-10')).toBe('data');
    expect(lookup.status('2026-09-09')).toBe('empty');
    expect(lookup.status('2026-08-01')).toBe('unknown');
  });
});
