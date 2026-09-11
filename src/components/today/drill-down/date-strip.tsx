'use client';

import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { DataDaysLookup } from '@/lib/presentation/data-days/data-days-chunks';
import { DataDayDot } from '@/components/today/drill-down/data-day-dot';
import {
  stripArrowDirection,
  stripDayClassName,
  stripDayProps,
  type StripDayProps,
} from '@/components/today/drill-down/date-strip-helpers';
import { useDateStripScroll } from '@/components/today/drill-down/use-date-strip-scroll';

function DateStripDay({
  day,
  onSelect,
  onOpenCalendar,
}: {
  day: StripDayProps;
  onSelect: (date: Date) => void;
  onOpenCalendar: () => void;
}) {
  return (
    <button
      aria-current={day.isToday ? 'date' : undefined}
      aria-haspopup={day.isSelected ? 'dialog' : undefined}
      aria-label={day.ariaLabel}
      aria-pressed={day.isSelected}
      className={stripDayClassName(day)}
      data-day-key={day.dayKey}
      disabled={day.isFuture}
      tabIndex={day.isSelected ? 0 : -1}
      type="button"
      onClick={() => (day.isSelected ? onOpenCalendar() : onSelect(day.dayStart))}
    >
      <span className="text-lg leading-none font-semibold tabular-nums sm:text-base">
        {day.dayNumber}
      </span>
      <span
        className={cn(
          'text-[0.6875rem] leading-none capitalize sm:text-[0.625rem]',
          day.isSelected ? 'text-background/80' : 'text-muted-foreground',
        )}
      >
        {day.weekdayLabel}
      </span>
      <DataDayDot inverse={day.isSelected} visible={day.hasData} />
    </button>
  );
}

/** Edge fade hints that the strip scrolls and keeps its ends from reading as cut-off cards. */
const STRIP_EDGE_FADE =
  '[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]';

const STRIP_CLASS = cn(
  'relative flex w-full gap-1.5 overflow-x-auto overscroll-x-contain px-1.5 py-0.5 sm:gap-1',
  'snap-x snap-proximity scroll-px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  STRIP_EDGE_FADE,
);

interface DateStripProps {
  days: readonly Date[];
  date: Date;
  maxDate: Date;
  dataDays: DataDaysLookup;
  onSelect: (date: Date) => void;
  onOpenCalendar: () => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  /** Null once the oldest allowed day is rendered. */
  onReachStart: (() => void) | null;
}

export function DateStrip({
  days,
  date,
  maxDate,
  dataDays,
  onSelect,
  onOpenCalendar,
  onPreviousDay,
  onNextDay,
  onReachStart,
}: DateStripProps) {
  const items = days.map((day) => stripDayProps({ day, date, maxDate, dataDays }));
  const selectedKey = items.find((item) => item.isSelected)?.dayKey ?? '';
  const { containerRef, sentinelRef } = useDateStripScroll({
    firstKey: items[0]?.dayKey ?? '',
    selectedKey,
    onReachStart,
  });

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = stripArrowDirection(event.key);
    if (direction) {
      event.preventDefault();
      (direction === 'previous' ? onPreviousDay : onNextDay)();
    }
  }

  return (
    <div
      ref={containerRef}
      aria-label="Jours"
      className={STRIP_CLASS}
      role="group"
      onKeyDown={handleKeyDown}
    >
      {onReachStart ? <span ref={sentinelRef} className="w-px shrink-0" aria-hidden /> : null}
      {items.map((item) => (
        <DateStripDay
          key={item.dayKey}
          day={item}
          onOpenCalendar={onOpenCalendar}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
