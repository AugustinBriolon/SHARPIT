import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';

export type TravelDateRange = {
  startDate: Date | string;
  endDate: Date | string;
};

function asUtcDay(value: Date | string): Date {
  return toUtcDateOnly(typeof value === 'string' ? new Date(value) : value);
}

/** Inclusive calendar-day overlap on UTC date-only bounds. */
export function travelRangesOverlap(a: TravelDateRange, b: TravelDateRange): boolean {
  const aStart = asUtcDay(a.startDate);
  const aEnd = asUtcDay(a.endDate);
  const bStart = asUtcDay(b.startDate);
  const bEnd = asUtcDay(b.endDate);
  return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}

export function filterTravelsOverlappingRange<T extends TravelDateRange & { type?: string }>(
  contexts: readonly T[],
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const range = { startDate: rangeStart, endDate: rangeEnd };
  return contexts.filter((context) => {
    if (context.type != null && context.type !== 'TRAVEL') return false;
    return travelRangesOverlap(context, range);
  });
}
