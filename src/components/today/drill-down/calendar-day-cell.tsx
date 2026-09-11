'use client';

import type { DataDayStatus } from '@/lib/presentation/data-days/data-days-chunks';
import {
  calendarDayCellClassName,
  calendarDayCellProps,
} from '@/components/today/drill-down/date-selector-helpers';
import { DataDayDot } from '@/components/today/drill-down/data-day-dot';

export function CalendarDayCell({
  day,
  date,
  visibleMonth,
  maxDate,
  minDate,
  dataStatus,
  onSelect,
}: {
  day: Date;
  date: Date;
  visibleMonth: Date;
  maxDate: Date;
  minDate?: Date;
  dataStatus: DataDayStatus;
  onSelect: (dayStart: Date) => void;
}) {
  const props = calendarDayCellProps({ day, date, visibleMonth, maxDate, minDate, dataStatus });

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
      <span className="leading-none">{props.dayNumber}</span>
      <span className="absolute bottom-1.5">
        <DataDayDot inverse={props.isSelected} visible={props.hasData} />
      </span>
    </button>
  );
}
