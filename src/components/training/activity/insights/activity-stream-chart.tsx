'use client';

import { ActivityType } from '@prisma/client';
import { memo, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import { ResponsiveChartFrame } from '@/components/ui/charts/responsive-chart-frame';
import {
  CHART_BASE_STROKE,
  CHART_GRID_COLOR,
  CHART_RECOVERY_STROKE,
  CHART_RISK_STROKE,
  CHART_TEMPO_STROKE,
  CHART_THRESHOLD_STROKE,
  CHART_TICK_COLOR,
  CHART_VO2_STROKE,
} from '@/lib/theme/chart-theme';
import {
  formatAltitudeMeters,
  type NormalizedStreamChartPoint,
} from '@/lib/streams/stream-chart-data';
import { cn } from '@/lib/utils';
import { buildStreamMetricOptions, type StreamMetricOption } from './activity-stream-chart-helpers';

export { buildStreamMetricOptions, type StreamMetricOption } from './activity-stream-chart-helpers';

type MetricKey = StreamMetricOption['key'];

type StreamChartPoint = {
  x: number;
  alt: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
  speed: number | null;
  pace: number | null;
};

export function pickDefaultStreamMetricKeys(
  metrics: StreamMetricOption[],
  type: ActivityType,
): MetricKey[] {
  const available = new Set(metrics.map((metric) => metric.key));
  const priorities: Record<ActivityType, MetricKey[]> = {
    [ActivityType.BIKE]: ['hr', 'watts', 'speed', 'alt', 'cadence', 'pace'],
    [ActivityType.RUN]: ['hr', 'pace', 'alt', 'cadence', 'speed', 'watts'],
    [ActivityType.SWIM]: ['hr', 'speed', 'cadence', 'alt', 'watts', 'pace'],
    [ActivityType.STRENGTH]: ['hr', 'watts', 'cadence', 'speed', 'alt', 'pace'],
    [ActivityType.TRIATHLON]: ['hr', 'watts', 'pace', 'speed', 'alt', 'cadence'],
    [ActivityType.HIKE]: ['hr', 'alt', 'speed', 'pace', 'cadence', 'watts'],
    [ActivityType.OTHER]: ['hr', 'speed', 'alt', 'watts', 'cadence', 'pace'],
  };

  const defaults = priorities[type].filter((key) => available.has(key)).slice(0, 2);
  if (defaults.length > 0) {
    return defaults;
  }
  return metrics.slice(0, 2).map((metric) => metric.key);
}

function formatMetricValue(metric: StreamMetricOption, value: number): string {
  return metric.formatter ? metric.formatter(value) : String(value);
}

function ActivityStreamChartComponent({
  samples,
  has,
  type,
}: {
  samples: NormalizedStreamChartPoint[];
  has: {
    distance: boolean;
    altitude: boolean;
    hr: boolean;
    watts: boolean;
    cadence: boolean;
    speed: boolean;
  };
  type: ActivityType;
}) {
  const useDistance = has.distance;
  const metrics = useMemo(() => buildStreamMetricOptions(has, type), [has, type]);
  const defaultSelected = useMemo(
    () => pickDefaultStreamMetricKeys(metrics, type),
    [metrics, type],
  );
  const [userSelectedKeys, setUserSelectedKeys] = useState<MetricKey[] | null>(null);
  const availableKeys = useMemo(() => new Set(metrics.map((metric) => metric.key)), [metrics]);
  const candidateKeys = userSelectedKeys ?? defaultSelected;
  const filteredKeys = candidateKeys.filter((key) => availableKeys.has(key));
  const selectedKeys = filteredKeys.length > 0 ? filteredKeys.slice(0, 2) : defaultSelected;

  const data: StreamChartPoint[] = useMemo(
    () =>
      samples.map((point) => ({
        x: useDistance ? point.xDistanceKm : point.xTimeMin,
        alt: point.alt,
        hr: point.hr,
        watts: point.watts,
        cadence: point.cadence,
        speed: point.speed,
        pace: point.pace,
      })),
    [samples, useDistance],
  );

  const selectedMetrics = metrics.filter((metric) => selectedKeys.includes(metric.key));

  if (!metrics.length || !selectedMetrics.length) {
    return null;
  }

  const xLabel = useDistance ? 'km' : 'min';
  const xFmt = (v: number) => (useDistance ? `${v.toFixed(0)}` : `${Math.round(v)}`);

  function toggleMetric(key: MetricKey) {
    setUserSelectedKeys((current) => {
      const base = current ?? defaultSelected;
      const isSelected = base.includes(key);
      if (isSelected) {
        if (base.length === 1) {
          return base;
        }
        return base.filter((entry) => entry !== key);
      }
      if (base.length >= 2) {
        return base;
      }
      return [...base, key];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1 sm:px-2">
        <div>
          <h2 className="text-label">Comparer les courbes</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Active 1 ou 2 séries pour garder des axes lisibles.
          </p>
        </div>
        <p className="text-muted-foreground text-data text-xs tabular-nums" role="status">
          {selectedMetrics.length}/{metrics.length} actives
        </p>
      </div>

      <div
        aria-label="Séries du graphique"
        className="flex flex-wrap gap-2 px-1 sm:px-2"
        role="group"
      >
        {metrics.map((metric) => {
          const selected = selectedKeys.includes(metric.key);
          const disabled = !selected && selectedKeys.length >= 2;

          return (
            <button
              key={metric.key}
              aria-label={metric.label}
              aria-pressed={selected}
              disabled={disabled}
              type="button"
              className={cn(
                'pressable min-h-11 rounded-lg border px-3 py-2 text-left sm:min-h-0',
                'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
                selected
                  ? 'border-primary/35 bg-analysis-surface-alt text-foreground'
                  : 'border-analysis-border bg-background text-muted-foreground',
                disabled && 'cursor-not-allowed opacity-45',
              )}
              onClick={() => toggleMetric(metric.key)}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: metric.color }}
                  aria-hidden
                />
                <span className="text-data text-xs">{metric.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-label={`Graphique de flux : ${selectedMetrics.map((m) => m.label).join(', ')}`}
        role="img"
      >
        <ResponsiveChartFrame height={248}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
              tickFormatter={xFmt}
              tickLine={false}
              type="number"
            />
            {selectedMetrics.map((metric, index) => (
              <YAxis
                key={metric.key}
                axisLine={false}
                domain={metric.reversed ? ['dataMax', 'dataMin'] : ['auto', 'auto']}
                orientation={index === 0 ? 'left' : 'right'}
                tick={{ fill: metric.color, fontSize: 11 }}
                tickFormatter={metric.formatter}
                tickLine={false}
                width={44}
                yAxisId={metric.key}
              />
            ))}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                return (
                  <ChartTooltipCard>
                    <p className="text-muted-foreground mb-1">
                      {xFmt(Number(label))} {xLabel}
                    </p>
                    {selectedMetrics.map((metric) => {
                      const datum = payload.find((entry) => entry.dataKey === metric.key);
                      if (!datum || datum.value === null) {
                        return null;
                      }
                      return (
                        <p key={metric.key} style={{ color: metric.color }}>
                          {metric.shortLabel}:{' '}
                          <span className="font-mono font-semibold">
                            {formatMetricValue(metric, datum.value as number)}
                          </span>{' '}
                          {metric.unit}
                        </p>
                      );
                    })}
                  </ChartTooltipCard>
                );
              }}
            />
            {selectedMetrics.map((metric) => (
              <Line
                key={metric.key}
                dataKey={metric.key}
                dot={false}
                isAnimationActive={false}
                stroke={metric.color}
                strokeWidth={2}
                type="monotone"
                yAxisId={metric.key}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveChartFrame>
      </div>
    </div>
  );
}

export const ActivityStreamChart = memo(ActivityStreamChartComponent);
