import { describe, expect, it } from 'vitest';
import { asLocalCalendarDate, toUtcDateOnly } from './calendar-date';

describe('toUtcDateOnly', () => {
  it('floors a UTC-midnight date to itself', () => {
    const result = toUtcDateOnly(new Date('2026-08-01T00:00:00.000Z'));
    expect(result.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('floors a date with a non-zero time to UTC midnight of its own UTC calendar day', () => {
    const result = toUtcDateOnly(new Date('2026-08-01T23:59:59.999Z'));
    expect(result.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('asLocalCalendarDate', () => {
  it('re-anchors a UTC-midnight ISO string onto the same calendar day locally', () => {
    const result = asLocalCalendarDate('2026-08-01T00:00:00.000Z');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
  });

  it('accepts a Date instance directly', () => {
    const result = asLocalCalendarDate(new Date('2026-12-31T00:00:00.000Z'));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });
});
