'use client';

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import type { PowerCurvePoint } from '@/lib/records';

interface PowerCurveChartProps {
  data: PowerCurvePoint[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PowerCurvePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="border-border/60 bg-card rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1 font-medium">{point.label}</p>
      <p className="text-foreground font-mono text-sm font-semibold">{point.watts} W</p>
      {point.title && <p className="text-muted-foreground mt-1 max-w-44 truncate">{point.title}</p>}
    </div>
  );
}

export function PowerCurveChart({ data }: PowerCurveChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Courbe de puissance</CardTitle>
        <p className="text-muted-foreground text-xs">
          Puissance maximale moyenne soutenue par durée (vélo)
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Aucune donnée de puissance en cache. Ouvre des sorties vélo avec capteur de puissance
            pour alimenter la courbe.
          </p>
        ) : (
          <ResponsiveChartFrame height={288}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                tickLine={false}
                unit=" W"
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                dataKey="watts"
                dot={{ r: 3, fill: '#ea580c' }}
                name="Puissance"
                stroke="#ea580c"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveChartFrame>
        )}
      </CardContent>
    </Card>
  );
}
