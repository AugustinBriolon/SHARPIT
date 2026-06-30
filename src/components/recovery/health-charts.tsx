'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HealthChartPoint } from '@/lib/health';

interface MetricLineChartProps {
  title: string;
  subtitle?: string;
  data: HealthChartPoint[];
  dataKey: keyof HealthChartPoint;
  color: string;
  unit?: string;
}

function Tip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="border-border/60 bg-card rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-semibold" style={{ color: payload[0].color }}>
        {payload[0].value}
        {unit ? ` ${unit}` : ''}
      </p>
    </div>
  );
}

export function MetricLineChart({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
}: MetricLineChartProps) {
  const ticks = data.filter((_, i) => i % 10 === 0 || i === data.length - 1);
  const hasData = data.some((d) => d[dataKey] != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          {hasData ? (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 10 }}
                  tickLine={false}
                  ticks={ticks.map((d) => d.label)}
                />
                <YAxis
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip content={<Tip unit={unit} />} />
                <Line
                  dataKey={dataKey}
                  dot={false}
                  stroke={color}
                  strokeWidth={2}
                  type="monotone"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Pas encore de données
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
