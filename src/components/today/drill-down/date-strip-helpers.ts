import {
  addDays,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DATA_DAYS_CHUNK_DAYS,
  type DataDaysLookup,
  type DataDayStatus,
} from '@/lib/presentation/data-days/data-days-chunks';

/** Days of context kept before the selected date when the strip first renders. */
const SELECTED_DAY_LEAD_DAYS = 7;

function clampToMin(day: Date, minDate: Date | undefined): Date {
  return minDate && isBefore(day, minDate) ? startOfDay(minDate) : day;
}

/**
 * First rendered day: today's data window, reaching further back when the selected
 * date needs context. Matching the window keeps the first paint to one request.
 */
export function initialStripStart(date: Date, maxDate: Date, minDate?: Date): Date {
  const windowStart = subDays(startOfDay(maxDate), DATA_DAYS_CHUNK_DAYS - 1);
  const leadStart = subDays(startOfDay(date), SELECTED_DAY_LEAD_DAYS);
  return clampToMin(isBefore(leadStart, windowStart) ? leadStart : windowStart, minDate);
}

/** Next start when the athlete scrolls to the oldest rendered day. */
export function extendStripStart(start: Date, minDate?: Date): Date {
  return clampToMin(subDays(start, DATA_DAYS_CHUNK_DAYS), minDate);
}

export function canExtendStrip(start: Date, minDate?: Date): boolean {
  return !minDate || isAfter(startOfDay(start), startOfDay(minDate));
}

/** Oldest → end of today's week; the remaining days of the week render disabled. */
export function buildStripDays(start: Date, maxDate: Date): Date[] {
  const end = endOfWeek(maxDate, { locale: fr });
  const days: Date[] = [];
  for (let day = startOfDay(start); !isAfter(day, end); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** The calendar's full 6-row grid for a month, Monday first. */
export function buildMonthGridDays(visibleMonth: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(visibleMonth), { locale: fr });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { locale: fr });
  const days: Date[] = [];
  for (let day = gridStart; !isAfter(day, gridEnd); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

export function dataStatusLabel(status: DataDayStatus): string {
  if (status === 'data') {
    return ' · données disponibles';
  }
  return status === 'empty' ? ' · aucune donnée' : '';
}

export interface StripDayProps {
  dayKey: string;
  dayStart: Date;
  dayNumber: string;
  weekdayLabel: string;
  ariaLabel: string;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasData: boolean;
}

export function stripDayProps({
  day,
  date,
  maxDate,
  dataDays,
}: {
  day: Date;
  date: Date;
  maxDate: Date;
  dataDays: DataDaysLookup;
}): StripDayProps {
  const dayStart = startOfDay(day);
  const dayKey = formatDate(dayStart, 'yyyy-MM-dd');
  const isFuture = isAfter(dayStart, maxDate);
  const effectiveStatus: DataDayStatus = isFuture ? 'unknown' : dataDays.status(dayKey);

  return {
    dayKey,
    dayStart,
    dayNumber: formatDate(dayStart, 'd'),
    weekdayLabel: formatDate(dayStart, 'EEE', { locale: fr }).replace('.', ''),
    ariaLabel: `${formatDate(dayStart, 'EEEE d MMMM', { locale: fr })}${dataStatusLabel(effectiveStatus)}`,
    isSelected: isSameDay(dayStart, date),
    isToday: isSameDay(dayStart, maxDate),
    isFuture,
    hasData: effectiveStatus === 'data',
  };
}

export function stripDayClassName({
  isSelected,
  isToday,
  isFuture,
}: Pick<StripDayProps, 'isSelected' | 'isToday' | 'isFuture'>): string {
  // Mobile: tappable cards. Desktop: quiet ghost cells, only the selection is filled.
  return cn(
    'pressable flex h-[4.25rem] w-[3.25rem] shrink-0 snap-center flex-col items-center justify-center gap-1 rounded-2xl border',
    'sm:h-14 sm:w-11 sm:gap-0.5 sm:rounded-xl',
    'focus-visible:outline-ring transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    isSelected
      ? 'bg-foreground text-background border-transparent'
      : 'bg-card text-foreground border-analysis-border/60 hover:bg-muted sm:border-transparent sm:bg-transparent',
    !isSelected && isToday && 'border-foreground/40 sm:border-foreground/25',
    isFuture && 'pointer-events-none opacity-40',
  );
}

/** ←/→ move the selection one day, like the header arrows. */
export function stripArrowDirection(key: string): 'previous' | 'next' | null {
  if (key === 'ArrowLeft') {
    return 'previous';
  }
  return key === 'ArrowRight' ? 'next' : null;
}
