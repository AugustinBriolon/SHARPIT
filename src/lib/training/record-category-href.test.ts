import { describe, expect, it } from 'vitest';
import { recordCategoryAnchorId, recordCategoryHref, recordSportTabFromCategory } from './records';

describe('recordCategoryHref', () => {
  it('opens Progression on the records tab with sport filter and category anchor', () => {
    expect(recordCategoryHref('run-5k')).toBe('/training/progression?tab=records&sport=run#run-5k');
    expect(recordCategoryHref('bike-ftp')).toBe(
      '/training/progression?tab=records&sport=bike#bike-ftp',
    );
    expect(recordCategoryHref('swim-distance')).toBe(
      '/training/progression?tab=records&sport=swim#swim-distance',
    );
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
