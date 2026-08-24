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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';

/** How far back a demo visitor can navigate — keeps them inside the window
 * the seed actually refreshes daily (see seed-demo-data.ts / ADR-026). */
const DEMO_HISTORY_DAYS = 6;

/** Exported for direct unit testing of the clamp logic — no next/navigation mocking needed. */
export function parseSelectedDate(
  raw: string | null,
  today: Date,
  minDate: Date | undefined,
): Date {
  if (!raw) return today;
  const parsed = parseISO(raw);
  if (!isValid(parsed)) return today;
  const normalized = startOfDay(parsed);
  if (isAfter(normalized, today)) return today;
  if (minDate && isBefore(normalized, minDate)) return minDate;
  return normalized;
}

export function useTodaySelectedDate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = useIsDemoMode();
  const today = useMemo(() => startOfDay(new Date()), []);
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
      let normalized = startOfDay(next);
      if (isAfter(normalized, today)) normalized = today;
      if (minDate && isBefore(normalized, minDate)) normalized = minDate;
      const params = new URLSearchParams(searchParams.toString());
      if (format(normalized, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        params.delete('date');
      } else {
        params.set('date', format(normalized, 'yyyy-MM-dd'));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [minDate, pathname, router, searchParams, today],
  );

  const goToPreviousDay = useCallback(() => {
    if (isAtMinDate) return;
    setDate(addDays(date, -1));
  }, [date, isAtMinDate, setDate]);
  const goToNextDay = useCallback(() => {
    if (!isToday) setDate(addDays(date, 1));
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
