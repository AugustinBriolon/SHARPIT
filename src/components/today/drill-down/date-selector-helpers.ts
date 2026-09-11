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
import type { DataDayStatus } from '@/lib/presentation/data-days-chunks';
import { dataStatusLabel } from '@/components/today/drill-down/date-strip-helpers';

export function calendarDayCellProps({
  day,
  date,
  visibleMonth,
  maxDate,
  minDate,
  dataStatus,
}: {
  day: Date;
  date: Date;
  visibleMonth: Date;
  maxDate: Date;
  minDate?: Date;
  dataStatus: DataDayStatus;
}) {
  const dayStart = startOfDay(day);
  const isSelected = isSameDay(dayStart, date);
  const isCurrentMonth = isSameMonth(dayStart, visibleMonth);
  const isDisabled =
    isAfter(dayStart, maxDate) || (minDate !== undefined && isBefore(dayStart, minDate));
  const isCurrentDay = isSameDay(dayStart, maxDate);

  return {
    dayStart,
    isSelected,
    isCurrentMonth,
    isDisabled,
    isCurrentDay,
    hasData: !isDisabled && dataStatus === 'data',
    dayLabel: `${formatDate(dayStart, 'EEEE d MMMM yyyy', { locale: fr })}${
      isDisabled ? '' : dataStatusLabel(dataStatus)
    }`,
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
    'hover:bg-muted relative inline-flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors sm:min-h-0',
    !isCurrentMonth && 'text-muted-foreground/45',
    isSelected && 'bg-foreground text-background hover:bg-foreground/90',
    !isSelected && isCurrentDay && 'ring-ring/50 ring-1',
    isDisabled && 'pointer-events-none opacity-35',
  );
}
