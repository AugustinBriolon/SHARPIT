'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartFigure } from '@/components/ui/charts/chart-figure';
import type {
  NutritionMacroTrendGranularity,
  NutritionMacroTrendPoint,
} from '@/core/presentation/nutrition-macro-trend-view-model';
import {
  isPresentationValuesLoading,
  useNutritionMacroTrendViewModel,
} from '@/hooks/use-presentation-view-model';
import { MACRO_COLORS } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

const StackedMacroChart = dynamic(
  () =>
    import('@/components/nutrition/blocks/stacked-macro-chart').then(
      (mod) => mod.StackedMacroChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);

const GRANULARITIES: { id: NutritionMacroTrendGranularity; label: string }[] = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Année' },
];

export function NutritionMacroTrendSection() {
  const [granularity, setGranularity] = useState<NutritionMacroTrendGranularity>('week');
  const query = useNutritionMacroTrendViewModel(granularity);
  const loading = isPresentationValuesLoading(query);
  const viewModel = query.data;

  // Nothing connected or nothing logged yet — the section stays silent rather
  // than showing an empty chart the athlete cannot act on.
  if (!loading && (!viewModel?.connected || viewModel.points.length === 0)) return null;

  return (
    <DrillDownSectionCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <DrillDownSectionLabel className="mb-0">Évolution des macros</DrillDownSectionLabel>
        <div className="border-analysis-border/70 inline-flex flex-wrap gap-1 rounded-full border p-1">
          {GRANULARITIES.map((option) => {
            const active = option.id === granularity;
            return (
              <button
                key={option.id}
                aria-pressed={active}
                type="button"
                className={cn(
                  'text-data min-h-11 rounded-full px-3 py-2 text-xs transition-colors lg:min-h-9 lg:px-2.5 lg:py-1.5',
                  active
                    ? 'bg-highlight text-highlight-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setGranularity(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading || !viewModel ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <MacroTrendBody points={viewModel.points} />
      )}
    </DrillDownSectionCard>
  );
}

function MacroTrendBody({ points }: { points: NutritionMacroTrendPoint[] }) {
  return (
    <div className="space-y-3">
      <ChartFigure
        height={220}
        title="Évolution des macros — grammes moyens par jour"
        series={[
          {
            name: 'Protéines',
            unit: 'g/j',
            points: points.map((p) => ({ label: p.label, value: p.proteinAvgG })),
          },
          {
            name: 'Glucides',
            unit: 'g/j',
            points: points.map((p) => ({ label: p.label, value: p.carbohydratesAvgG })),
          },
          {
            name: 'Lipides',
            unit: 'g/j',
            points: points.map((p) => ({ label: p.label, value: p.fatAvgG })),
          },
        ]}
      >
        <StackedMacroChart points={points} />
      </ChartFigure>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Legend dotClassName={MACRO_COLORS.protein.dot} label="Protéines" />
        <Legend dotClassName={MACRO_COLORS.carbs.dot} label="Glucides" />
        <Legend dotClassName={MACRO_COLORS.fat.dot} label="Lipides" />
      </div>
    </div>
  );
}

function Legend({ dotClassName, label }: { dotClassName: string; label: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', dotClassName)} aria-hidden />
      {label}
    </span>
  );
}
