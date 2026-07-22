import { describe, expect, it } from 'vitest';
import { buildSparkPaths } from './sparkline';

describe('buildSparkPaths', () => {
  it('keeps a continuous line when rest days are 0 (not null)', () => {
    const { line } = buildSparkPaths([40, 0, 0, 80, 0, 20], 200, 32);
    expect(line.startsWith('M ')).toBe(true);
    // One continuous path — no second M after the start
    expect(line.match(/M /g)?.length ?? 0).toBe(1);
    expect(line.includes(' L ')).toBe(true);
  });

  it('breaks the path on null (missing recovery samples)', () => {
    const { line } = buildSparkPaths([40, null, null, 80, null, 20], 200, 32);
    expect((line.match(/M /g) ?? []).length).toBeGreaterThan(1);
  });
});
