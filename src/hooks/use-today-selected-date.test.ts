import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { parseSelectedDate, selectedDateUrl } from './use-today-selected-date';

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

describe('selectedDateUrl', () => {
  const base = { pathname: '/today/sleep', today: TODAY, minDate: undefined };

  it('sets the date param for a past day and keeps other params', () => {
    expect(
      selectedDateUrl({ ...base, search: 'tab=x', next: new Date('2026-08-20T00:00:00') }),
    ).toBe('/today/sleep?tab=x&date=2026-08-20');
  });

  it('drops the date param when navigating back to today', () => {
    expect(selectedDateUrl({ ...base, search: 'date=2026-08-20', next: TODAY })).toBe(
      '/today/sleep',
    );
  });

  it('clamps a future day to today', () => {
    expect(selectedDateUrl({ ...base, search: '', next: new Date('2026-09-10T00:00:00') })).toBe(
      '/today/sleep',
    );
  });

  it('clamps a day before minDate to minDate', () => {
    expect(
      selectedDateUrl({ ...base, minDate: MIN_DATE, search: '', next: new Date('2026-07-01') }),
    ).toBe(`/today/sleep?date=${fmt(MIN_DATE)}`);
  });
});
