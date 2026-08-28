'use client';

import {
  calendarDayCellClassName,
  calendarDayCellProps,
} from '@/components/today/drill-down/date-selector-helpers';

export function CalendarDayCell({
  day,
  date,
  visibleMonth,
  maxDate,
  minDate,
  onSelect,
}: {
  day: Date;
  date: Date;
  visibleMonth: Date;
  maxDate: Date;
  minDate?: Date;
  onSelect: (dayStart: Date) => void;
}) {
  const props = calendarDayCellProps({ day, date, visibleMonth, maxDate, minDate });

  return (
    <button
      aria-current={props.isCurrentDay ? 'date' : undefined}
      aria-disabled={props.isDisabled || undefined}
      aria-label={props.dayLabel}
      aria-selected={props.isSelected}
      className={calendarDayCellClassName(props)}
      disabled={props.isDisabled}
      role="gridcell"
      type="button"
      onClick={() => onSelect(props.dayStart)}
    >
      {props.dayNumber}
    </button>
  );
}
