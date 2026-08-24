import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { parseSelectedDate } from './use-today-selected-date';

const TODAY = new Date('2026-08-24T00:00:00.000Z');
const MIN_DATE = new Date('2026-08-18T00:00:00.000Z'); // today - 6 days

function fmt(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

describe('parseSelectedDate', () => {
  it('defaults to today when there is no raw value', () => {
    expect(fmt(parseSelectedDate(null, TODAY, undefined))).toBe(fmt(TODAY));
  });

  it('defaults to today for an invalid date string', () => {
    expect(fmt(parseSelectedDate('not-a-date', TODAY, undefined))).toBe(fmt(TODAY));
  });

  it('clamps a future date to today, with no minDate set', () => {
    expect(fmt(parseSelectedDate('2026-09-01', TODAY, undefined))).toBe(fmt(TODAY));
  });

  it('passes through an in-range date with no minDate set', () => {
    expect(fmt(parseSelectedDate('2026-01-01', TODAY, undefined))).toBe('2026-01-01');
  });

  it('passes through a date on or after minDate', () => {
    expect(fmt(parseSelectedDate('2026-08-20', TODAY, MIN_DATE))).toBe('2026-08-20');
    expect(fmt(parseSelectedDate('2026-08-18', TODAY, MIN_DATE))).toBe(fmt(MIN_DATE));
  });

  it('clamps a date before minDate up to minDate', () => {
    expect(fmt(parseSelectedDate('2026-07-01', TODAY, MIN_DATE))).toBe(fmt(MIN_DATE));
  });

  it('still clamps a future date to today even with minDate set', () => {
    expect(fmt(parseSelectedDate('2026-09-01', TODAY, MIN_DATE))).toBe(fmt(TODAY));
  });
});
