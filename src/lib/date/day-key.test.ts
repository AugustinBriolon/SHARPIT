import { describe, expect, it } from 'vitest';
import { dayKeyFromDate, dayLabelFromDayKey, shortDayFromDate } from '@/lib/date/day-key';

/** How Prisma hands back a `@db.Date` column. */
const storedDay = new Date('2026-08-22T00:00:00.000Z');

describe('dayKeyFromDate', () => {
  it('reads the calendar day, not the local rendering of midnight UTC', () => {
    expect(dayKeyFromDate(storedDay)).toBe('2026-08-22');
  });

  it('holds for a day a local formatter would shift backwards', () => {
    // 1 January is the case where the shift also changes month and year.
    expect(dayKeyFromDate(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01');
  });

  it('pads single digits', () => {
    expect(dayKeyFromDate(new Date('2026-03-07T00:00:00.000Z'))).toBe('2026-03-07');
  });
});

describe('shortDayFromDate', () => {
  it('renders day and month from the calendar day', () => {
    expect(shortDayFromDate(storedDay)).toBe('22/08');
    expect(shortDayFromDate(new Date('2026-01-01T00:00:00.000Z'))).toBe('01/01');
  });
});

describe('dayLabelFromDayKey', () => {
  it('turns a machine key into what the athlete reads', () => {
    expect(dayLabelFromDayKey('2026-08-21')).toBe('21/08');
  });

  it('returns anything unparseable untouched rather than inventing a date', () => {
    expect(dayLabelFromDayKey('demain')).toBe('demain');
  });
});
