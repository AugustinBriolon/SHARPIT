'use client';

import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { CHART_COLORS, type PmcPoint } from '@/lib/analytics';

interface LoadChartProps {
  data: PmcPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border/60 bg-card rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function LoadChart({ data }: LoadChartProps) {
  const ticks = data.filter((_, i) => i % 14 === 0 || i === data.length - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Charge d&apos;entraînement</CardTitle>
        <p className="text-muted-foreground text-xs">
          CTL (forme) · ATL (fatigue) · TSB (fraîcheur) — modèle Banister
        </p>
      </CardHeader>
      <CardContent>
        <div
          aria-label="Charge d'entraînement — CTL (forme), ATL (fatigue), TSB (fraîcheur)"
          role="img"
        >
          <ResponsiveChartFrame height={288}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                tickLine={false}
                ticks={ticks.map((d) => d.label)}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Line
                dataKey="ctl"
                dot={false}
                name="CTL"
                stroke={CHART_COLORS.ctl}
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="atl"
                dot={false}
                name="ATL"
                stroke={CHART_COLORS.atl}
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="tsb"
                dot={false}
                name="TSB"
                stroke={CHART_COLORS.tsb}
                strokeDasharray="4 4"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveChartFrame>
        </div>
      </CardContent>
    </Card>
  );
}
