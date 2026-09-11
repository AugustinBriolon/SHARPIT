import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  buildMonthGridDays,
  buildStripDays,
  canExtendStrip,
  extendStripStart,
  initialStripStart,
  stripArrowDirection,
  stripDayProps,
} from '@/components/today/drill-down/date-strip-helpers';
import { calendarDayCellProps } from '@/components/today/drill-down/date-selector-helpers';
import type { DataDaysLookup, DataDayStatus } from '@/lib/presentation/data-days/data-days-chunks';

const TODAY = new Date(2026, 8, 11); // Friday

function key(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function lookup(statuses: Record<string, DataDayStatus>): DataDaysLookup {
  return { status: (dayKey) => statuses[dayKey] ?? 'unknown' };
}

describe('initialStripStart', () => {
  it('starts with the 28-day data window when today is selected', () => {
    expect(key(initialStripStart(TODAY, TODAY))).toBe('2026-08-15');
  });

  it('reaches back a week before an older selected date', () => {
    expect(key(initialStripStart(new Date(2026, 6, 1), TODAY))).toBe('2026-06-24');
  });

  it('never starts before the demo window', () => {
    expect(key(initialStripStart(TODAY, TODAY, new Date(2026, 8, 5)))).toBe('2026-09-05');
  });
});

describe('extendStripStart / canExtendStrip', () => {
  it('prepends one chunk of days', () => {
    expect(key(extendStripStart(new Date(2026, 7, 15)))).toBe('2026-07-18');
  });

  it('stops at the demo window', () => {
    const minDate = new Date(2026, 8, 5);

    expect(key(extendStripStart(new Date(2026, 8, 10), minDate))).toBe('2026-09-05');
    expect(canExtendStrip(new Date(2026, 8, 5), minDate)).toBe(false);
    expect(canExtendStrip(new Date(2026, 8, 6), minDate)).toBe(true);
    expect(canExtendStrip(new Date(2026, 8, 6))).toBe(true);
  });
});

describe('buildStripDays', () => {
  it('runs from the start through the end of the current week', () => {
    const days = buildStripDays(new Date(2026, 8, 9), TODAY).map(key);

    expect(days).toEqual(['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
  });
});

describe('buildMonthGridDays', () => {
  it('fills whole Monday-first weeks around the month', () => {
    const days = buildMonthGridDays(new Date(2026, 8, 1));

    expect(key(days[0])).toBe('2026-08-31');
    expect(key(days[days.length - 1])).toBe('2026-10-04');
    expect(days).toHaveLength(35);
  });
});

describe('stripDayProps', () => {
  it('labels the selected day with its data status', () => {
    const props = stripDayProps({
      day: new Date(2026, 8, 9),
      date: new Date(2026, 8, 9),
      maxDate: TODAY,
      dataDays: lookup({ '2026-09-09': 'data' }),
    });

    expect(props).toMatchObject({
      dayKey: '2026-09-09',
      dayNumber: '9',
      weekdayLabel: 'mer',
      isSelected: true,
      isToday: false,
      isFuture: false,
      hasData: true,
      ariaLabel: 'mercredi 9 septembre · données disponibles',
    });
  });

  it('says so when a loaded day has no data', () => {
    const props = stripDayProps({
      day: new Date(2026, 8, 8),
      date: TODAY,
      maxDate: TODAY,
      dataDays: lookup({ '2026-09-08': 'empty' }),
    });

    expect(props.hasData).toBe(false);
    expect(props.ariaLabel).toBe('mardi 8 septembre · aucune donnée');
  });

  it('never marks a future day as having data', () => {
    const props = stripDayProps({
      day: new Date(2026, 8, 12),
      date: TODAY,
      maxDate: TODAY,
      dataDays: lookup({ '2026-09-12': 'data' }),
    });

    expect(props).toMatchObject({ isFuture: true, hasData: false });
    expect(props.ariaLabel).toBe('samedi 12 septembre');
  });
});

describe('stripArrowDirection', () => {
  it('maps horizontal arrows to day steps', () => {
    expect(stripArrowDirection('ArrowLeft')).toBe('previous');
    expect(stripArrowDirection('ArrowRight')).toBe('next');
    expect(stripArrowDirection('Enter')).toBeNull();
  });
});

describe('calendarDayCellProps', () => {
  const base = { date: TODAY, visibleMonth: new Date(2026, 8, 1), maxDate: TODAY };

  it('marks a navigable day with data', () => {
    const props = calendarDayCellProps({ ...base, day: new Date(2026, 8, 7), dataStatus: 'data' });

    expect(props.hasData).toBe(true);
    expect(props.dayLabel).toBe('lundi 7 septembre 2026 · données disponibles');
  });

  it('hides the data marker on disabled days', () => {
    const props = calendarDayCellProps({
      ...base,
      day: new Date(2026, 8, 1),
      minDate: new Date(2026, 8, 5),
      dataStatus: 'data',
    });

    expect(props).toMatchObject({ isDisabled: true, hasData: false });
    expect(props.dayLabel).toBe('mardi 1 septembre 2026');
  });
});
