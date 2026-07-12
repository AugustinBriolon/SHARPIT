'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip } from 'recharts';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { buildDailyWindowSeries, indexHealthEntriesByDay } from '@/lib/health';
import type { ClientHealthEntry } from '@/lib/query/types';

import {
  buildSleepScoreBreakdown,
  computeSleepDebt7d,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep-scoring';
import { CHART_RECOVERY_STROKE, CHART_TEMPO_STROKE } from '@/lib/chart-theme';

export function EvolutionChart({
  entries,
  sleepTargetMin = SLEEP_TARGET_MIN,
}: {
  entries: ClientHealthEntry[];
  sleepTargetMin?: number;
}) {
  const today = new Date();
  const byDay = indexHealthEntriesByDay(entries);
  const chartData = buildDailyWindowSeries(
    byDay,
    7,
    (d, e) => ({
      day: format(d, 'EEE', { locale: fr }),
      recovery: e?.recoveryScore ?? null,
      sleep: e
        ? buildSleepScoreBreakdown(
            e.sleepDeepMin ?? null,
            e.sleepRemMin ?? null,
            e.sleepMinutes ?? null,
            computeSleepDebt7d(entries, d, sleepTargetMin),
          ).sharpitScore
        : null,
    }),
    today,
  );

  const hasData = chartData.some((p) => p.recovery !== null || p.sleep !== null);

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <EyebrowLabel variant="dashboard">Évolution 7 jours</EyebrowLabel>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Récup
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Sommeil
          </span>
        </div>
      </div>
      {hasData ? (
        <ResponsiveChartFrame height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.07} />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltipCard>
                    <p className="text-muted-foreground mb-1">{label}</p>
                    {payload.map((entry) => (
                      <p
                        key={entry.name}
                        className="font-medium tabular-nums"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {entry.value != null ? entry.value : '—'}
                      </p>
                    ))}
                  </ChartTooltipCard>
                );
              }}
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="recovery"
              dot={false}
              name="Récup"
              stroke={CHART_RECOVERY_STROKE}
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="sleep"
              dot={false}
              name="Sommeil"
              stroke={CHART_TEMPO_STROKE}
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
          </LineChart>
        </ResponsiveChartFrame>
      ) : (
        <div className="flex h-[140px] items-center justify-center">
          <p className="text-muted-foreground text-xs">Pas encore de données sur 7 jours</p>
        </div>
      )}
    </div>
  );
}
