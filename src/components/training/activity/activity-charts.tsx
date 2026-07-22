'use client';

import { ActivityType } from '@prisma/client';
import { memo } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ChartPoint {
  x: number; // distance (km) ou temps (min)
  alt: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
  speed: number | null; // km/h
  pace: number | null; // sec/km
}

interface MetricConfig {
  key: keyof Omit<ChartPoint, 'x'>;
  label: string;
  color: string;
  unit: string;
  format?: (v: number) => string;
}

function paceFmt(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}`;
}

function ActivityChartsComponent({
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

  const data: ChartPoint[] = samples.map((point) => ({
    x: useDistance ? point.xDistanceKm : point.xTimeMin,
    alt: point.alt,
    hr: point.hr,
    watts: point.watts,
    cadence: point.cadence,
    speed: point.speed,
    pace: point.pace,
  }));

  const metrics: MetricConfig[] = [];
  if (has.altitude)
    metrics.push({
      key: 'alt',
      label: 'Altitude',
      color: CHART_RECOVERY_STROKE,
      unit: 'm',
      format: formatAltitudeMeters,
    });
  if (has.hr)
    metrics.push({
      key: 'hr',
      label: 'Fréquence cardiaque',
      color: CHART_RISK_STROKE,
      unit: 'bpm',
    });
  if (has.watts)
    metrics.push({
      key: 'watts',
      label: 'Puissance',
      color: CHART_THRESHOLD_STROKE,
      unit: 'W',
    });
  // Course : allure ; autres : vitesse
  if (has.speed && type === ActivityType.RUN)
    metrics.push({
      key: 'pace',
      label: 'Allure',
      color: CHART_VO2_STROKE,
      unit: '/km',
      format: paceFmt,
    });
  else if (has.speed)
    metrics.push({
      key: 'speed',
      label: 'Vitesse',
      color: CHART_BASE_STROKE,
      unit: 'km/h',
    });
  if (has.cadence)
    metrics.push({
      key: 'cadence',
      label: 'Cadence',
      color: CHART_TEMPO_STROKE,
      unit: type === ActivityType.RUN ? 'spm' : 'rpm',
    });

  if (!metrics.length) return null;

  const xLabel = useDistance ? 'km' : 'min';
  const xFmt = (v: number) => (useDistance ? `${v.toFixed(0)}` : `${Math.round(v)}`);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {metrics.map((m) => (
        <Card key={m.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
              <span className="text-muted-foreground text-xs font-normal">({m.unit})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveChartFrame height={176}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="x"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                  tickFormatter={xFmt}
                  tickLine={false}
                  type="number"
                  unit={xLabel === 'km' ? '' : ''}
                />
                <YAxis
                  axisLine={false}
                  domain={m.key === 'pace' ? ['dataMax', 'dataMin'] : ['auto', 'auto']}
                  tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                  tickFormatter={m.format ? (v: number) => m.format!(v) : undefined}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const v = payload[0].value as number;
                    return (
                      <div className="analysis-panel rounded-analysis px-3 py-2 text-xs shadow-none">
                        <p className="text-muted-foreground mb-1">
                          {xFmt(Number(label))} {xLabel}
                        </p>
                        <p style={{ color: m.color }}>
                          <span className="font-mono font-semibold">
                            {m.format ? m.format(v) : v}
                          </span>{' '}
                          {m.unit}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  dataKey={m.key}
                  dot={false}
                  fill={m.color}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                  stroke={m.color}
                  strokeWidth={2}
                  type="monotone"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveChartFrame>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const ActivityCharts = memo(ActivityChartsComponent);
