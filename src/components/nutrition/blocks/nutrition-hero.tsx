'use client';

import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import { buildNutritionDayReading } from '@/lib/nutrition/day-reading';

function confidencePctForDay(day: NutritionDaySummary | null): number | null {
  if (!day) {
    return null;
  }
  if (day.complete) {
    return 100;
  }
  if (day.goalsProgress) {
    return 90;
  }
  return 70;
}

export function NutritionHero({
  date,
  day,
  isToday,
  maxDate,
  minDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  loading = false,
  emptyHint,
}: {
  date: Date;
  day: NutritionDaySummary | null;
  isToday: boolean;
  maxDate: Date;
  minDate?: Date;
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  loading?: boolean;
  emptyHint?: string | null;
}) {
  const reading = buildNutritionDayReading(day, isToday);
  const caption = loading
    ? undefined
    : (reading.caption ?? ((!day || day.meals.length === 0) && emptyHint ? emptyHint : undefined));

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePctForDay(day)}
      date={date}
      eyebrow="Nutrition"
      headline={reading.headline}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      minDate={minDate}
      quickReadCaption={caption}
      railCaption=""
      railValue={day?.meals.length ?? null}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
