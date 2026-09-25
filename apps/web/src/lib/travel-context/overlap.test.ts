import { describe, expect, it } from 'vitest';
import { filterTravelsOverlappingRange, travelRangesOverlap } from './overlap';

describe('travelRangesOverlap', () => {
  it('detects overlapping inclusive ranges', () => {
    expect(
      travelRangesOverlap(
        { startDate: '2026-07-12', endDate: '2026-07-19' },
        { startDate: '2026-07-13', endDate: '2026-07-19' },
      ),
    ).toBe(true);
  });

  it('detects adjacent same-day touch as overlap', () => {
    expect(
      travelRangesOverlap(
        { startDate: '2026-07-12', endDate: '2026-07-12' },
        { startDate: '2026-07-12', endDate: '2026-07-19' },
      ),
    ).toBe(true);
  });

  it('rejects disjoint ranges', () => {
    expect(
      travelRangesOverlap(
        { startDate: '2026-07-01', endDate: '2026-07-05' },
        { startDate: '2026-07-10', endDate: '2026-07-19' },
      ),
    ).toBe(false);
  });
});

describe('filterTravelsOverlappingRange', () => {
  it('returns every TRAVEL overlapping the range, not only the first', () => {
    const weekStart = new Date('2026-07-13T00:00:00.000Z');
    const weekEnd = new Date('2026-07-19T00:00:00.000Z');
    const result = filterTravelsOverlappingRange(
      [
        {
          id: 'a',
          type: 'TRAVEL',
          startDate: '2026-07-12',
          endDate: '2026-07-19',
        },
        {
          id: 'b',
          type: 'TRAVEL',
          startDate: '2026-07-15',
          endDate: '2026-07-22',
        },
        {
          id: 'c',
          type: 'CONSTRAINT',
          startDate: '2026-07-13',
          endDate: '2026-07-19',
        },
        {
          id: 'd',
          type: 'TRAVEL',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
        },
      ],
      weekStart,
      weekEnd,
    );

    expect(result.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
