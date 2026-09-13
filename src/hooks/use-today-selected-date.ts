'use client';

import {
  addDays,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import {
  getClientTrainingDayIdSnapshot,
  subscribeTrainingDayChange,
} from '@/lib/date/subscribe-training-day';
import { trainingDayIdToDate } from '@/lib/training/periodization/training-day';

/** How far back a demo visitor can navigate — keeps them inside the window
 * the seed actually refreshes daily (see seed-demo-data.ts / ADR-026). */
const DEMO_HISTORY_DAYS = 6;

/** Exported for direct unit testing of the clamp logic — no next/navigation mocking needed. */
export function parseSelectedDate(
  raw: string | null,
  today: Date,
  minDate: Date | undefined,
): Date {
  if (!raw) {
    return today;
  }
  const parsed = parseISO(raw);
  if (!isValid(parsed)) {
    return today;
  }
  const normalized = startOfDay(parsed);
  if (isAfter(normalized, today)) {
    return today;
  }
  if (minDate && isBefore(normalized, minDate)) {
    return minDate;
  }
  return normalized;
}

/** URL for `next`, clamped to the navigable window; today drops the param. */
export function selectedDateUrl({
  pathname,
  search,
  next,
  today,
  minDate,
}: {
  pathname: string;
  search: string;
  next: Date;
  today: Date;
  minDate: Date | undefined;
}): string {
  let normalized = startOfDay(next);
  if (isAfter(normalized, today)) {
    normalized = today;
  }
  if (minDate && isBefore(normalized, minDate)) {
    normalized = minDate;
  }
  const params = new URLSearchParams(search);
  if (format(normalized, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    params.delete('date');
  } else {
    params.set('date', format(normalized, 'yyyy-MM-dd'));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useTodaySelectedDate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = useIsDemoMode();
  // Re-read when the athlete training-day id flips (local midnight) — never pin at mount.
  const trainingDayId = useSyncExternalStore(
    subscribeTrainingDayChange,
    getClientTrainingDayIdSnapshot,
    getClientTrainingDayIdSnapshot,
  );
  const today = useMemo(() => startOfDay(trainingDayIdToDate(trainingDayId)), [trainingDayId]);
  const minDate = useMemo(
    () => (isDemo ? subDays(today, DEMO_HISTORY_DAYS) : undefined),
    [isDemo, today],
  );

  const date = useMemo(
    () => parseSelectedDate(searchParams.get('date'), today, minDate),
    [searchParams, today, minDate],
  );

  const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  const isAtMinDate = minDate
    ? format(date, 'yyyy-MM-dd') === format(minDate, 'yyyy-MM-dd')
    : false;

  const setDate = useCallback(
    (next: Date) => {
      // Native history syncs useSearchParams without an RSC round-trip, so the screen
      // switches day on tap and shows its loading state while the day's data arrives.
      window.history.replaceState(
        null,
        '',
        selectedDateUrl({ pathname, search: searchParams.toString(), next, today, minDate }),
      );
    },
    [minDate, pathname, searchParams, today],
  );

  const goToPreviousDay = useCallback(() => {
    if (isAtMinDate) {
      return;
    }
    setDate(addDays(date, -1));
  }, [date, isAtMinDate, setDate]);
  const goToNextDay = useCallback(() => {
    if (!isToday) {
      setDate(addDays(date, 1));
    }
  }, [date, isToday, setDate]);

  return {
    date,
    isToday,
    maxDate: today,
    /** Demo sessions only — undefined for a real athlete. */
    minDate,
    setDate,
    goToPreviousDay,
    goToNextDay,
  };
}
