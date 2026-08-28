import {
  format as formatDate,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function calendarDayCellProps({
  day,
  date,
  visibleMonth,
  maxDate,
  minDate,
}: {
  day: Date;
  date: Date;
  visibleMonth: Date;
  maxDate: Date;
  minDate?: Date;
}) {
  const dayStart = startOfDay(day);
  const isSelected = isSameDay(dayStart, date);
  const isCurrentMonth = isSameMonth(dayStart, visibleMonth);
  const isDisabled =
    isAfter(dayStart, maxDate) || (minDate !== null && isBefore(dayStart, minDate));
  const isCurrentDay = isSameDay(dayStart, maxDate);

  return {
    dayStart,
    isSelected,
    isCurrentMonth,
    isDisabled,
    isCurrentDay,
    dayLabel: formatDate(dayStart, 'EEEE d MMMM yyyy', { locale: fr }),
    dayNumber: formatDate(dayStart, 'd'),
  };
}

export function calendarDayCellClassName({
  isCurrentMonth,
  isSelected,
  isCurrentDay,
  isDisabled,
}: {
  isCurrentMonth: boolean;
  isSelected: boolean;
  isCurrentDay: boolean;
  isDisabled: boolean;
}) {
  return cn(
    'hover:bg-muted inline-flex aspect-square min-h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors sm:min-h-0',
    !isCurrentMonth && 'text-muted-foreground/45',
    isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
    !isSelected && isCurrentDay && 'ring-ring/50 ring-1',
    isDisabled && 'pointer-events-none opacity-35',
  );
}
