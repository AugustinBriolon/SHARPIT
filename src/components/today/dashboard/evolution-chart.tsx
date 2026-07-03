'use client';

import { format, subDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import type { ClientHealthEntry } from '@/lib/query/types';

import { computeSharpitSleepScoreForDay, SLEEP_TARGET_MIN } from '@/lib/sleep-scoring';

export function EvolutionChart({
  entries,
  sleepTargetMin = SLEEP_TARGET_MIN,
}: {
  entries: ClientHealthEntry[];
  sleepTargetMin?: number;
}) {
  const today = new Date();
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const e = entries.find((en) => isSameDay(new Date(en.date), d));
    return {
      day: format(d, 'EEE', { locale: fr }),
      recovery: e?.recoveryScore ?? null,
      sleep: computeSharpitSleepScoreForDay(entries, d, sleepTargetMin),
    };
  });

  const hasData = chartData.some((p) => p.recovery !== null || p.sleep !== null);

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
          Évolution 7 jours
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />
            Récup
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
            <span className="inline-block h-1.5 w-3 rounded-full bg-blue-500" />
            Sommeil
          </span>
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.07} />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }}
              tickLine={false}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (v != null ? v : '—') as any}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '11px',
              }}
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="recovery"
              dot={false}
              name="Récup"
              stroke="#10b981"
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="sleep"
              dot={false}
              name="Sommeil"
              stroke="#3b82f6"
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[140px] items-center justify-center">
          <p className="text-xs text-slate-400">Pas encore de données sur 7 jours</p>
        </div>
      )}
    </div>
  );
}
