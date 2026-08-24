'use client';

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import type { NutritionMacroTrendPoint } from '@/core/presentation/nutrition-macro-trend-view-model';
import {
  CHART_GRID_COLOR,
  CHART_TICK_COLOR,
  MACRO_CARB_COLOR,
  MACRO_FAT_COLOR,
  MACRO_PROTEIN_COLOR,
} from '@/lib/theme/chart-theme';

function MacroTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: NutritionMacroTrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <ChartTooltipCard>
      <p className="mb-1 font-medium">{point.label}</p>
      <p className="text-muted-foreground">Protéines {point.proteinAvgG} g/j</p>
      <p className="text-muted-foreground">Glucides {point.carbohydratesAvgG} g/j</p>
      <p className="text-muted-foreground">Lipides {point.fatAvgG} g/j</p>
      <p className="text-muted-foreground mt-1">
        {point.caloriesAvg} kcal/j · {point.daysLogged} j journalisé
        {point.daysLogged > 1 ? 's' : ''}
      </p>
    </ChartTooltipCard>
  );
}

/** Stacked grams-per-day bars — one bar per bucket, macros stacked within it. */
export function StackedMacroChart({ points }: { points: NutritionMacroTrendPoint[] }) {
  return (
    <BarChart data={points} margin={{ top: 4, right: 4, bottom: 2, left: 2 }}>
      <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
      <XAxis
        axisLine={false}
        dataKey="label"
        interval="preserveStartEnd"
        tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
        tickLine={false}
      />
      <YAxis
        axisLine={false}
        tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
        tickLine={false}
        width={32}
      />
      <Tooltip content={<MacroTrendTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
      <Bar dataKey="proteinAvgG" fill={MACRO_PROTEIN_COLOR} name="Protéines" stackId="macros" />
      <Bar dataKey="carbohydratesAvgG" fill={MACRO_CARB_COLOR} name="Glucides" stackId="macros" />
      <Bar
        dataKey="fatAvgG"
        fill={MACRO_FAT_COLOR}
        name="Lipides"
        radius={[4, 4, 0, 0]}
        stackId="macros"
      />
    </BarChart>
  );
}
