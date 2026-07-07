'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isAfter,
  isSameDay,
  isSameMonth,
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
import { cn } from '@/lib/utils';

export function TodayDateSelector({
  date,
  maxDate,
  isToday,
  onChange,
  onPreviousDay,
  onNextDay,
}: {
  date: Date;
  maxDate: Date;
  isToday: boolean;
  onChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(date));

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
    if (nextOpen) setVisibleMonth(startOfMonth(date));
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <Button
          aria-label="Jour précédent"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onPreviousDay}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Button
          className="max-w-[min(72vw,18rem)] min-w-0 gap-2 rounded-full px-3"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(true)}
        >
          <CalendarDays className="text-muted-foreground size-3.5 shrink-0" />
          <span className="truncate text-xs capitalize">
            {formatDate(date, 'EEEE d MMMM', { locale: fr })}
          </span>
        </Button>

        <Button
          aria-label="Jour suivant"
          disabled={isToday}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onNextDay}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-3 p-0 sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Sélectionner une date</DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <div className="px-4 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <Button
                aria-label="Mois précédent"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <p className="text-sm font-semibold capitalize">
                {formatDate(visibleMonth, 'LLLL yyyy', { locale: fr })}
              </p>

              <Button
                aria-label="Mois suivant"
                disabled={!isAfter(startOfMonth(maxDate), startOfMonth(visibleMonth))}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdayLabels.map((label, index) => (
                <span
                  key={`${index}-${label}`}
                  className="text-muted-foreground py-1 text-[11px] font-medium uppercase"
                >
                  {label}
                </span>
              ))}
              {monthDays.map((day) => {
                const dayStart = startOfDay(day);
                const isSelected = isSameDay(dayStart, date);
                const isCurrentMonth = isSameMonth(dayStart, visibleMonth);
                const isDisabled = isAfter(dayStart, maxDate);
                const isCurrentDay = isSameDay(dayStart, maxDate);

                return (
                  <button
                    key={day.toISOString()}
                    disabled={isDisabled}
                    type="button"
                    className={cn(
                      'hover:bg-muted inline-flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      !isCurrentMonth && 'text-muted-foreground/45',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      !isSelected && isCurrentDay && 'ring-ring/50 ring-1',
                      isDisabled && 'pointer-events-none opacity-35',
                    )}
                    onClick={() => {
                      onChange(dayStart);
                      setOpen(false);
                    }}
                  >
                    {formatDate(dayStart, 'd')}
                  </button>
                );
              })}
            </div>

            {!isToday && (
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
