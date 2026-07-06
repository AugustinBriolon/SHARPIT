import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { SleepSectionLabel } from '@/components/sleep/sleep-section-label';
import type { SleepBarPoint } from '@/components/sleep/types';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { formatSleepDuration } from '@/lib/sleep-scoring';
import { Bar, BarChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

function SleepTrendBars({ data, targetMin }: { data: SleepBarPoint[]; targetMin: number }) {
  const hasData = data.some((d) => d.minutes !== null);
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">Pas encore assez de données.</p>;
  }

  return (
    <ResponsiveChartFrame height={120}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
        />
        <YAxis domain={[0, 600]} hide />
        <ReferenceLine stroke="#cbd5e1" strokeDasharray="3 3" y={targetMin} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const pt = payload[0].payload as SleepBarPoint;
            return (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                <p className="font-semibold tabular-nums">{formatSleepDuration(pt.minutes)}</p>
                <p className="text-muted-foreground">{pt.date}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.fill} />
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
      <SleepSectionLabel>14 derniers jours</SleepSectionLabel>
      <SleepTrendBars data={data} targetMin={targetMin} />
      <div className="mt-3 flex justify-center gap-4">
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600">
          <span className="size-2 rounded-full bg-emerald-500" />≥ objectif
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-amber-600">
          <span className="size-2 rounded-full bg-amber-500" />
          sous objectif
        </span>
      </div>
    </DrillDownSectionCard>
  );
}
