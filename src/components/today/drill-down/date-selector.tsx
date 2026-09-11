'use client';

import { useMemo, useState } from 'react';
import { format as formatDate, isAfter, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { NavArrowLeft, NavArrowRight } from '@/components/icons/nav-arrows';
import { Button } from '@/components/ui/button';
import { DateCalendarDialog } from '@/components/today/drill-down/date-calendar-dialog';
import { DateStrip } from '@/components/today/drill-down/date-strip';
import {
  buildMonthGridDays,
  buildStripDays,
  canExtendStrip,
  extendStripStart,
  initialStripStart,
} from '@/components/today/drill-down/date-strip-helpers';
import { useDataDays } from '@/hooks/use-data-days';
import type { DataDaysDomain } from '@/lib/presentation/data-days';
import { dataDaysChunkRanges, mergeDayRanges } from '@/lib/presentation/data-days-chunks';

/** Oldest rendered day grows as the athlete scrolls back, and never skips the selected date. */
function useStripDays(date: Date, maxDate: Date, minDate?: Date) {
  const [extendedStart, setExtendedStart] = useState<Date | null>(null);
  const baseStart = initialStripStart(date, maxDate, minDate);
  const stripStart =
    extendedStart && isBefore(extendedStart, baseStart) ? extendedStart : baseStart;
  const stripStartKey = stripStart.getTime();
  const days = useMemo(
    () => buildStripDays(new Date(stripStartKey), maxDate),
    [stripStartKey, maxDate],
  );
  const onReachStart = canExtendStrip(stripStart, minDate)
    ? () => setExtendedStart(extendStripStart(stripStart, minDate))
    : null;
  return { stripStart, days, onReachStart };
}

function useSelectorDataDays({
  domain,
  stripStart,
  maxDate,
  calendarMonth,
}: {
  domain: DataDaysDomain;
  stripStart: Date;
  maxDate: Date;
  /** Null while the calendar is closed. */
  calendarMonth: Date | null;
}) {
  const stripStartKey = stripStart.getTime();
  const maxDateKey = maxDate.getTime();
  const calendarMonthKey = calendarMonth?.getTime() ?? null;
  const ranges = useMemo(() => {
    const anchor = new Date(maxDateKey);
    const stripRanges = dataDaysChunkRanges(new Date(stripStartKey), anchor, anchor);
    if (calendarMonthKey === null) {
      return stripRanges;
    }
    const grid = buildMonthGridDays(new Date(calendarMonthKey));
    return mergeDayRanges(stripRanges, dataDaysChunkRanges(grid[0], grid[grid.length - 1], anchor));
  }, [calendarMonthKey, maxDateKey, stripStartKey]);
  return useDataDays(domain, ranges);
}

function DayStepButtons({
  isToday,
  isAtMinDate,
  onPreviousDay,
  onNextDay,
}: Pick<DateSelectorHeaderProps, 'isToday' | 'isAtMinDate' | 'onPreviousDay' | 'onNextDay'>) {
  return (
    <>
      <Button
        aria-label="Jour précédent"
        className="hidden sm:inline-flex"
        disabled={isAtMinDate}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={onPreviousDay}
      >
        <NavArrowLeft className="size-4" aria-hidden />
      </Button>
      <Button
        aria-label="Jour suivant"
        className="hidden sm:inline-flex"
        disabled={isToday}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={onNextDay}
      >
        <NavArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

interface DateSelectorHeaderProps {
  date: Date;
  isToday: boolean;
  isAtMinDate: boolean;
  onOpenCalendar: () => void;
  onToday: () => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
}

function DateSelectorHeader({
  date,
  onOpenCalendar,
  onToday,
  ...stepProps
}: DateSelectorHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Button
        aria-haspopup="dialog"
        className="-ml-2 gap-1.5 px-2"
        size="sm"
        type="button"
        variant="ghost"
        onClick={onOpenCalendar}
      >
        <CalendarDays className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold capitalize">
          {formatDate(date, 'LLLL yyyy', { locale: fr })}
        </span>
      </Button>

      <div className="flex items-center gap-1">
        {!stepProps.isToday ? (
          <Button size="sm" type="button" variant="ghost" onClick={onToday}>
            Aujourd&apos;hui
          </Button>
        ) : null}
        <DayStepButtons {...stepProps} />
      </div>
    </div>
  );
}

/** Calendar is opened on the selected date's month and closes once a day is picked. */
function useCalendarDialog(date: Date, onChange: (date: Date) => void) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(date));

  return {
    open,
    visibleMonth,
    setOpen,
    setVisibleMonth,
    openCalendar: () => {
      setVisibleMonth(startOfMonth(date));
      setOpen(true);
    },
    select: (next: Date) => {
      onChange(next);
      setOpen(false);
    },
  };
}

interface TodayDateSelectorProps {
  date: Date;
  maxDate: Date;
  /** Set only for a demo session — fences navigation to the rolling seeded window. */
  minDate?: Date;
  isToday: boolean;
  /** Which drill-down's data the availability dots reflect. */
  dataDomain: DataDaysDomain;
  onChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
}

export function TodayDateSelector(props: TodayDateSelectorProps) {
  const { date, maxDate, minDate, isToday, dataDomain, onChange } = props;
  const calendar = useCalendarDialog(date, onChange);
  const { stripStart, days, onReachStart } = useStripDays(date, maxDate, minDate);
  const dataDays = useSelectorDataDays({
    domain: dataDomain,
    stripStart,
    maxDate,
    calendarMonth: calendar.open ? calendar.visibleMonth : null,
  });
  const navigation = { isToday, onPreviousDay: props.onPreviousDay, onNextDay: props.onNextDay };

  return (
    <div aria-label="Date" className="flex w-full flex-col gap-2 sm:max-w-3xl" role="group">
      <DateSelectorHeader
        {...navigation}
        date={date}
        isAtMinDate={minDate ? !isAfter(startOfDay(date), minDate) : false}
        onOpenCalendar={calendar.openCalendar}
        onToday={() => onChange(maxDate)}
      />
      <DateStrip
        {...navigation}
        dataDays={dataDays}
        date={date}
        days={days}
        maxDate={maxDate}
        onOpenCalendar={calendar.openCalendar}
        onReachStart={onReachStart}
        onSelect={onChange}
      />
      <DateCalendarDialog
        dataDays={dataDays}
        date={date}
        isToday={isToday}
        maxDate={maxDate}
        minDate={minDate}
        open={calendar.open}
        visibleMonth={calendar.visibleMonth}
        onOpenChange={calendar.setOpen}
        onSelect={calendar.select}
        onVisibleMonthChange={calendar.setVisibleMonth}
      />
    </div>
  );
}
