import { describe, expect, it } from 'vitest';
import { durationDelta, formatDelta, loadDelta } from './thread-delta';

describe('durationDelta', () => {
  it('compares minutes done against minutes prescribed', () => {
    // 68 min performed against a 60 min prescription — a long run that ran long.
    expect(durationDelta(4080, 60)).toMatchObject({ value: 8, verdict: 'within' });
  });

  it('calls a drift past the tolerance something else', () => {
    expect(durationDelta(4800, 60)?.verdict).toBe('over'); // 80 min for 60
    expect(durationDelta(3000, 60)?.verdict).toBe('over'); // 50 min for 60
  });

  it('produces nothing when either side is missing', () => {
    expect(durationDelta(null, 60)).toBeNull();
    expect(durationDelta(3600, null)).toBeNull();
  });

  it('refuses to divide by a prescription of zero', () => {
    expect(durationDelta(3600, 0)).toBeNull();
  });
});

describe('loadDelta', () => {
  it('compares TSS on both sides', () => {
    expect(loadDelta(86, 80)).toMatchObject({ value: 6, verdict: 'within' });
    expect(loadDelta(120, 80)?.verdict).toBe('over');
  });
});

describe('formatDelta', () => {
  it('always shows the sign, and a true minus rather than a hyphen', () => {
    expect(formatDelta({ value: 8, ratio: 0.13, verdict: 'over' }, 'min')).toBe('+8 min');
    expect(formatDelta({ value: -12, ratio: -0.15, verdict: 'over' }, 'TSS')).toBe('−12 TSS');
  });

  it('marks an exact match rather than printing a bare zero', () => {
    expect(formatDelta({ value: 0, ratio: 0, verdict: 'within' }, 'min')).toBe('±0 min');
  });
});
