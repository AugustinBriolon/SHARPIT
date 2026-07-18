import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { SleepSectionLabel } from '@/components/sleep/sleep-section-label';
import type { SleepBarPoint } from '@/components/sleep/types';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { formatSleepDuration } from '@/lib/sleep-scoring';
import { Bar, BarChart, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_TICK_COLOR } from '@/lib/chart-theme';

function SleepTrendBars({ data, targetMin }: { data: SleepBarPoint[]; targetMin: number }) {
  const hasData = data.some((d) => d.minutes !== null);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">Pas encore assez de données.</p>;
  }

  return (
    <ResponsiveChartFrame height={140}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fontSize: 9, fill: CHART_TICK_COLOR }}
          tickLine={false}
        />
        <YAxis domain={[0, 600]} hide />
        <ReferenceLine
          stroke="var(--color-signal-base)"
          strokeDasharray="3 3"
          strokeOpacity={0.7}
          y={targetMin}
        />
        <Tooltip
          cursor={{ fill: 'color-mix(in oklch, var(--muted) 35%, transparent)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const pt = payload[0].payload as SleepBarPoint;
            const above = pt.minutes != null && pt.minutes >= targetMin;
            return (
              <div className="analysis-panel rounded-analysis px-3 py-2 text-xs shadow-md">
                <p className="text-data font-semibold tabular-nums">
                  {formatSleepDuration(pt.minutes)}
                </p>
                <p className="text-muted-foreground">{pt.date}</p>
                <p className={above ? 'text-muted-foreground/70' : 'text-signal-caution'}>
                  {above ? 'objectif atteint' : 'sous objectif'}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="minutes" maxBarSize={18} radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.date} fill={entry.fill} fillOpacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveChartFrame>
  );
}

export function SleepTrendSection({
  data,
  targetMin,
}: {
  data: SleepBarPoint[];
  targetMin: number;
}) {
  return (
    <DrillDownSectionCard>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <SleepSectionLabel className="mb-0">Tendance · 14 jours</SleepSectionLabel>
        <p className="text-muted-foreground text-[10px]">
          objectif {formatSleepDuration(targetMin)} en pointillé
        </p>
      </div>
      <SleepTrendBars data={data} targetMin={targetMin} />
      <div className="mt-3 flex justify-end gap-4">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
          <span className="size-1.5 rounded-full bg-[var(--color-signal-base)] opacity-80" />
          objectif atteint
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
          <span className="size-1.5 rounded-full bg-[var(--color-signal-caution)] opacity-80" />
          sous objectif
        </span>
      </div>
    </DrillDownSectionCard>
  );
}
