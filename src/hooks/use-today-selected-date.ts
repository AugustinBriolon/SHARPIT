'use client';

import { addDays, format, isAfter, isValid, parseISO, startOfDay } from 'date-fns';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

function parseSelectedDate(raw: string | null, today: Date): Date {
  if (!raw) return today;
  const parsed = parseISO(raw);
  if (!isValid(parsed)) return today;
  const normalized = startOfDay(parsed);
  return isAfter(normalized, today) ? today : normalized;
}

export function useTodaySelectedDate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = useMemo(() => startOfDay(new Date()), []);

  const date = useMemo(
    () => parseSelectedDate(searchParams.get('date'), today),
    [searchParams, today],
  );

  const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  const setDate = useCallback(
    (next: Date) => {
      const normalized = startOfDay(next);
      const clamped = isAfter(normalized, today) ? today : normalized;
      const params = new URLSearchParams(searchParams.toString());
      if (format(clamped, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        params.delete('date');
      } else {
        params.set('date', format(clamped, 'yyyy-MM-dd'));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, today],
  );

  const goToPreviousDay = useCallback(() => setDate(addDays(date, -1)), [date, setDate]);
  const goToNextDay = useCallback(() => {
    if (!isToday) setDate(addDays(date, 1));
  }, [date, isToday, setDate]);

  return {
    date,
    isToday,
    maxDate: today,
    setDate,
    goToPreviousDay,
    goToNextDay,
  };
}
