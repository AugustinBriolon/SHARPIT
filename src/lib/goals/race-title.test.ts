import { describe, expect, it } from 'vitest';
import { buildRaceTitle } from './race-title';

describe('buildRaceTitle', () => {
  it('joins format and target when both are present', () => {
    expect(buildRaceTitle('Half Ironman', 'Sub 5h00')).toBe('Half Ironman · Sub 5h00');
  });

  it('uses format alone when there is no target', () => {
    expect(buildRaceTitle('Marathon', '')).toBe('Marathon');
  });

  it('uses target alone when there is no format', () => {
    expect(buildRaceTitle(null, 'Top 10')).toBe('Top 10');
  });

  it('falls back when both are empty', () => {
    expect(buildRaceTitle('  ', null)).toBe('Course');
  });
});
