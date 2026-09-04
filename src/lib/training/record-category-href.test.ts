import { describe, expect, it } from 'vitest';
import { recordCategoryAnchorId, recordCategoryHref, recordSportTabFromCategory } from './records';

describe('recordCategoryHref', () => {
  it('opens Performance with sport filter and category anchor', () => {
    expect(recordCategoryHref('run-5k')).toBe('/moi/performance?sport=run#run-5k');
    expect(recordCategoryHref('bike-ftp')).toBe('/moi/performance?sport=bike#bike-ftp');
    expect(recordCategoryHref('swim-distance')).toBe('/moi/performance?sport=swim#swim-distance');
  });

  it('maps categories to sport tabs used by RecordsPanel', () => {
    expect(recordSportTabFromCategory('run-5k')).toBe('run');
    expect(recordSportTabFromCategory('power-20m')).toBe('bike');
    expect(recordSportTabFromCategory('swim-distance')).toBe('swim');
  });

  it('keeps anchor id identical to category key', () => {
    expect(recordCategoryAnchorId('run-5k')).toBe('run-5k');
  });
});
