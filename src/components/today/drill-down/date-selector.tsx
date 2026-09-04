'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isAfter,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDayCell } from '@/components/today/drill-down/calendar-day-cell';

/** Fixed pill width — long FR weekdays (“mercredi 18 septembre”) still fit. */
const DATE_PILL_CLASS = 'h-9 w-[15.5rem] shrink-0 justify-center gap-2 rounded-full px-3';

export function TodayDateSelector({
  date,
  maxDate,
  minDate,
  isToday,
  onChange,
  onPreviousDay,
  onNextDay,
}: {
  date: Date;
  maxDate: Date;
  /** Set only for a demo session — fences navigation to the rolling seeded window. */
  minDate?: Date;
  isToday: boolean;
  onChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(date));
  const isAtMinDate = minDate ? !isAfter(startOfDay(date), minDate) : false;

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { locale: fr });
    const gridEnd = endOfWeek(monthEnd, { locale: fr });
    const days: Date[] = [];
    for (let current = gridStart; current <= gridEnd; current.setDate(current.getDate() + 1)) {
      days.push(new Date(current));
    }
    return days;
  }, [visibleMonth]);

  const weekdayLabels = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { locale: fr });
    return Array.from({ length: 7 }, (_, index) =>
      formatDate(
        new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index),
        'EEEEE',
        {
          locale: fr,
        },
      ),
    );
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setVisibleMonth(startOfMonth(date));
    }
  }

  return (
    <>
      <div aria-label="Date" className="flex w-full items-center justify-center gap-1" role="group">
        <Button
          aria-label="Jour précédent"
          className="size-11 sm:size-7"
          disabled={isAtMinDate}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onPreviousDay}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>

        <Button
          aria-expanded={open}
          aria-haspopup="dialog"
          className={DATE_PILL_CLASS}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(true)}
        >
          <CalendarDays className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate text-xs capitalize">
            {formatDate(date, 'EEEE d MMMM', { locale: fr })}
          </span>
        </Button>

        <Button
          aria-label="Jour suivant"
          className="size-11 sm:size-7"
          disabled={isToday}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onNextDay}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-3 p-0 sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Sélectionner une date</DialogTitle>
            <DialogDescription>
              Choisis un jour pour consulter l&apos;état physiologique à cette date.
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <Button
                aria-label="Mois précédent"
                className="size-11 sm:size-7"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
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
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>

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
                  date={date}
                  day={day}
                  maxDate={maxDate}
                  minDate={minDate}
                  visibleMonth={visibleMonth}
                  onSelect={(dayStart) => {
                    onChange(dayStart);
                    setOpen(false);
                  }}
                />
              ))}
            </div>

            {minDate ? (
              <p className="text-muted-foreground mt-4 text-xs">
                Démo limitée aux {formatDate(minDate, 'd MMMM', { locale: fr })} –{' '}
                {formatDate(maxDate, 'd MMMM', { locale: fr })}.
              </p>
            ) : null}

            {!isToday ? (
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onChange(maxDate);
                    setOpen(false);
                  }}
                >
                  Revenir à aujourd&apos;hui
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
