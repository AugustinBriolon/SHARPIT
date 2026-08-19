'use client';

import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';

function headlineForDay(day: NutritionDaySummary | null, isToday: boolean): string {
  const remaining = day?.goalsProgress?.calories.remaining;
  if (day?.goalsProgress) {
    if (remaining != null && remaining > 0) {
      return `${remaining.toLocaleString('fr-FR')} kcal restantes`;
    }
    if (remaining === 0) return 'Objectif calorique atteint';
    if (remaining != null && remaining < 0) {
      return `${Math.abs(remaining).toLocaleString('fr-FR')} kcal au-dessus`;
    }
  }

  if (!day) {
    return isToday ? 'Journal vide' : 'Aucune donnée';
  }
  if (day.complete) return 'Journal complet';
  if (day.meals.length > 0) return 'Journal en cours';
  return isToday ? 'Journal vide' : 'Aucune donnée';
}

function quickReadCaption(
  loading: boolean,
  day: NutritionDaySummary | null,
  emptyHint?: string | null,
): string | undefined {
  if (loading) return undefined;
  const goals = day?.goalsProgress;
  if (goals) return formatRemainingCalories(goals.calories.remaining);
  if (day) {
    return `P ${Math.round(day.protein)} g · G ${Math.round(day.carbohydrates)} g · L ${Math.round(day.fat)} g`;
  }
  return emptyHint ?? undefined;
}

function confidencePctForDay(day: NutritionDaySummary | null): number | null {
  if (!day) return null;
  if (day.complete) return 100;
  if (day.goalsProgress) return 90;
  return 70;
}

export function NutritionHero({
  date,
  day,
  isToday,
  maxDate,
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
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  loading?: boolean;
  emptyHint?: string | null;
}) {
  const caption = quickReadCaption(loading, day, emptyHint);

  return (
    <PhysioDrillDownHero
      confidencePct={confidencePctForDay(day)}
      date={date}
      eyebrow="Nutrition"
      headline={headlineForDay(day, isToday)}
      isToday={isToday}
      loading={loading}
      maxDate={maxDate}
      quickReadCaption={caption}
      quickReadLabel="apports caloriques"
      quickReadSuffix="kcal"
      quickReadValue={day ? String(day.calories) : '—'}
      railCaption=""
      railValue={day?.calories ?? null}
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
