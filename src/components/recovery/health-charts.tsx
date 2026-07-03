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
import { CorpsPanel } from '@/components/corps/corps-ui';

interface MetricLineChartProps<T extends { label: string }> {
  title: string;
  subtitle?: string;
  data: T[];
  dataKey: keyof T & string;
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

export function MetricLineChart<T extends { label: string }>({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
}: MetricLineChartProps<T>) {
  const ticks = data.filter((_, i) => i % 10 === 0 || i === data.length - 1);
  const hasData = data.some((d) => d[dataKey] != null);

  return (
    <CorpsPanel className="overflow-hidden p-0">
      <div className="border-border/50 border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-muted-foreground mt-0.5 text-[10px]">{subtitle}</p>}
      </div>
      <div className="px-2 pt-1 pb-3">
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
      </div>
    </CorpsPanel>
  );
}
