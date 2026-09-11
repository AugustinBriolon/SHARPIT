'use client';

import { useMemo } from 'react';
import {
  addMonths,
  format as formatDate,
  isAfter,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { NavArrowLeft, NavArrowRight } from '@/components/icons/nav-arrows';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDayCell } from '@/components/today/drill-down/calendar-day-cell';
import { DataDayDot } from '@/components/today/drill-down/data-day-dot';
import { buildMonthGridDays } from '@/components/today/drill-down/date-strip-helpers';
import type { DataDaysLookup } from '@/lib/presentation/data-days/data-days-chunks';

function useWeekdayLabels(): string[] {
  return useMemo(() => {
    const weekStart = startOfWeek(new Date(), { locale: fr });
    return Array.from({ length: 7 }, (_, index) =>
      formatDate(
        new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index),
        'EEEEE',
        { locale: fr },
      ),
    );
  }, []);
}

function MonthNavigation({
  visibleMonth,
  maxDate,
  onVisibleMonthChange,
}: {
  visibleMonth: Date;
  maxDate: Date;
  onVisibleMonthChange: (month: Date) => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <Button
        aria-label="Mois précédent"
        className="size-11 sm:size-7"
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => onVisibleMonthChange(subMonths(visibleMonth, 1))}
      >
        <NavArrowLeft className="size-4" aria-hidden />
      </Button>

      <p aria-live="polite" className="text-sm font-semibold capitalize">
        {formatDate(visibleMonth, 'LLLL yyyy', { locale: fr })}
      </p>

      <Button
        aria-label="Mois suivant"
        className="size-11 sm:size-7"
        disabled={!isAfter(startOfMonth(maxDate), startOfMonth(visibleMonth))}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}
      >
        <NavArrowRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

function CalendarFooter({
  isToday,
  minDate,
  maxDate,
  onSelect,
}: {
  isToday: boolean;
  minDate?: Date;
  maxDate: Date;
  onSelect: (date: Date) => void;
}) {
  return (
    <>
      <div className="text-muted-foreground mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <DataDayDot inverse={false} visible />
          Données disponibles
        </span>
        {!isToday ? (
          <Button size="sm" type="button" variant="outline" onClick={() => onSelect(maxDate)}>
            Revenir à aujourd&apos;hui
          </Button>
        ) : null}
      </div>
      {minDate ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Démo limitée aux {formatDate(minDate, 'd MMMM', { locale: fr })} –{' '}
          {formatDate(maxDate, 'd MMMM', { locale: fr })}.
        </p>
      ) : null}
    </>
  );
}

function CalendarGrid({
  date,
  maxDate,
  minDate,
  visibleMonth,
  dataDays,
  onSelect,
}: Pick<
  DateCalendarDialogProps,
  'date' | 'maxDate' | 'minDate' | 'visibleMonth' | 'dataDays' | 'onSelect'
>) {
  const weekdayLabels = useWeekdayLabels();
  const monthDays = useMemo(() => buildMonthGridDays(visibleMonth), [visibleMonth]);

  return (
    <div
      aria-label={formatDate(visibleMonth, 'LLLL yyyy', { locale: fr })}
      className="grid grid-cols-7 gap-1 text-center"
      role="grid"
    >
      {weekdayLabels.map((label, index) => (
        <span key={`${index}-${label}`} className="text-label py-1" role="columnheader">
          {label}
        </span>
      ))}
      {monthDays.map((day) => (
        <CalendarDayCell
          key={day.toISOString()}
          dataStatus={dataDays.status(formatDate(day, 'yyyy-MM-dd'))}
          date={date}
          day={day}
          maxDate={maxDate}
          minDate={minDate}
          visibleMonth={visibleMonth}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface DateCalendarDialogProps {
  open: boolean;
  date: Date;
  isToday: boolean;
  maxDate: Date;
  minDate?: Date;
  visibleMonth: Date;
  dataDays: DataDaysLookup;
  onOpenChange: (open: boolean) => void;
  onVisibleMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
}

export function DateCalendarDialog({
  open,
  isToday,
  onOpenChange,
  onVisibleMonthChange,
  ...gridProps
}: DateCalendarDialogProps) {
  const { maxDate, minDate, visibleMonth, onSelect } = gridProps;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-0 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Sélectionner une date</DialogTitle>
          <DialogDescription>
            Choisis un jour pour consulter l&apos;état physiologique à cette date.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4">
          <MonthNavigation
            maxDate={maxDate}
            visibleMonth={visibleMonth}
            onVisibleMonthChange={onVisibleMonthChange}
          />
          <CalendarGrid {...gridProps} />
          <CalendarFooter
            isToday={isToday}
            maxDate={maxDate}
            minDate={minDate}
            onSelect={onSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
