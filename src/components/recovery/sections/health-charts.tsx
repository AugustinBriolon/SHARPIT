'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { CorpsPanel } from '@/components/corps/corps-ui';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { CHART_ACTIVE_DOT_FILL, CHART_GRID_COLOR, CHART_TICK_COLOR } from '@/lib/theme/chart-theme';

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

interface MetricLineChartProps<T extends { label: string }> {
  title: string;
  subtitle?: string;
  data: T[];
  dataKey: keyof T & string;
  color: string;
  unit?: string;
  loading?: boolean;
}

function Tip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; payload?: { date?: string; label?: string } }>;
  unit?: string;
}) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const rawDate = payload[0]?.payload?.date;
  const displayLabel = rawDate
    ? new Date(rawDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : payload[0]?.payload?.label;
  return (
    <div className="analysis-panel rounded-analysis px-3 py-2 text-xs shadow-none">
      <p className="text-muted-foreground">{displayLabel}</p>
      <p className="font-mono font-semibold" style={{ color: payload[0].color }}>
        {formatMetricValue(payload[0].value)}
        {unit ? ` ${unit}` : ''}
      </p>
    </div>
  );
}

function chartTickStep(dataLength: number): number {
  if (dataLength > 240) return 24;
  if (dataLength > 120) return 16;
  if (dataLength > 60) return 10;
  return 6;
}

export function MetricLineChart<T extends { label: string }>({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
  loading = false,
}: MetricLineChartProps<T>) {
  const tickStep = chartTickStep(data.length);
  const ticks = data.filter((_, i) => i % tickStep === 0 || i === data.length - 1);
  const hasData = data.some((d) => d[dataKey] != null);

  return (
    <CorpsPanel className="overflow-hidden p-0">
      <div className="border-border/50 border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-muted-foreground mt-0.5 text-[10px]">{subtitle}</p>}
      </div>
      <div className="px-2 pt-1 pb-3">
        <div className="relative w-full">
          {hasData ? (
            <div className={cn('transition-opacity', loading && 'opacity-45')}>
              <ResponsiveChartFrame height={192}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fill: CHART_TICK_COLOR, fontSize: 10 }}
                    tickLine={false}
                    ticks={ticks.map((d) => d.label)}
                  />
                  <YAxis
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tick={{ fill: CHART_TICK_COLOR, fontSize: 10 }}
                    tickFormatter={(value: number) => formatMetricValue(value)}
                    tickLine={false}
                  />
                  <Tooltip content={<Tip unit={unit} />} />
                  <Line
                    dataKey={dataKey}
                    dot={{ r: 2, strokeWidth: 0, fill: color }}
                    isAnimationActive={false}
                    stroke={color}
                    strokeWidth={2}
                    type="monotone"
                    activeDot={{
                      r: 4,
                      stroke: color,
                      strokeWidth: 1.5,
                      fill: CHART_ACTIVE_DOT_FILL,
                    }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveChartFrame>
            </div>
          ) : (
            <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
              Pas encore de données
            </div>
          )}
          {loading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-2 py-2">
              <Skeleton className="mx-2 h-3 w-20" />
              <Skeleton className="mx-1 h-36 w-[calc(100%-0.5rem)] rounded-lg" />
              <div className="mx-2 flex justify-between gap-2">
                <Skeleton className="h-2 w-8" />
                <Skeleton className="h-2 w-8" />
                <Skeleton className="h-2 w-8" />
                <Skeleton className="h-2 w-8" />
              </div>
            </div>
          )}
        </div>
      </div>
    </CorpsPanel>
  );
}
