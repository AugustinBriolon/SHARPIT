'use client';

import { Drumstick, Droplets, Flame, Wheat } from 'lucide-react';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import { cn } from '@/lib/utils';

function CalorieTrend({
  history,
  selectedDate,
  onDateSelect,
}: {
  history: NutritionDaySummary[];
  selectedDate: string;
  onDateSelect?: (date: Date) => void;
}) {
  if (history.length === 0) return null;

  const ordered = history.slice().reverse();
  const max = Math.max(...ordered.map((d) => d.calories), 1);

  return (
    <div aria-label="Apports des 7 derniers jours" className="flex items-end gap-1" role="img">
      {ordered.map((d) => {
        const h = Math.max(4, (d.calories / max) * 72);
        const selected = d.date === selectedDate;
        const [year, month, day] = d.date.split('-').map(Number);

        return (
          <button
            key={d.date}
            aria-label={`${d.date} — ${d.calories} kilocalories`}
            aria-pressed={selected}
            className="group focus-visible:outline-ring flex flex-1 flex-col items-center gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            type="button"
            onClick={() => onDateSelect?.(new Date(year, month - 1, day))}
          >
            <div
              style={{ height: h }}
              className={cn(
                'group-hover:bg-primary/80 w-full rounded-t-sm transition-colors',
                selected ? 'bg-primary' : 'bg-primary/45',
              )}
            />
            <span
              className={cn(
                'text-[10px] tabular-nums',
                selected ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {d.date.slice(8)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NutritionTrendSection({
  history,
  selectedDate,
  averages,
  loading = false,
  onDateSelect,
}: {
  history: NutritionDaySummary[];
  selectedDate: string;
  averages: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  } | null;
  loading?: boolean;
  onDateSelect?: (date: Date) => void;
}) {
  if (loading) {
    return (
      <section className="analysis-panel rounded-analysis-lg space-y-4 p-4">
        <div className="bg-muted h-4 w-32 animate-pulse rounded-full" />
        <div className="bg-muted h-20 animate-pulse rounded-lg" />
      </section>
    );
  }

  if (history.length <= 1) return null;

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-4 p-4 sm:p-5">
      <p className="text-section-title">7 derniers jours</p>
      <CalorieTrend history={history} selectedDate={selectedDate} onDateSelect={onDateSelect} />
      {averages ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-label text-muted-foreground">Moyenne quotidienne</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Flame, label: 'kcal', value: averages.calories },
              { icon: Drumstick, label: 'Protéines', value: `${averages.protein} g` },
              { icon: Wheat, label: 'Glucides', value: `${averages.carbohydrates} g` },
              { icon: Droplets, label: 'Lipides', value: `${averages.fat} g` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-muted/35 rounded-xl px-3 py-2.5 text-center sm:py-3"
              >
                <stat.icon className="text-muted-foreground mx-auto size-3.5" aria-hidden />
                <p className="text-data mt-1 text-sm font-semibold tabular-nums">{stat.value}</p>
                <p className="text-muted-foreground text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
