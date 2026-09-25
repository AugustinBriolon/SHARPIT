import { describe, expect, it } from 'vitest';
import { formatDate } from '@/lib/format';

describe('formatDate', () => {
  it('formats valid dates', () => {
    expect(formatDate(new Date('2026-07-22T12:00:00Z'))).toMatch(/22/);
  });

  it('accepts ISO strings without throwing', () => {
    expect(formatDate('2026-07-22T12:00:00.000Z')).toMatch(/22/);
  });

  it('returns em dash for invalid values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate(new Date(Number.NaN))).toBe('—');
  });
});
