'use client';

import { ActivityType } from '@prisma/client';
import { memo } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAltitudeMeters, type NormalizedStreamChartPoint } from '@/lib/stream-chart-data';

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
      color: '#059669',
      unit: 'm',
      format: formatAltitudeMeters,
    });
  if (has.hr)
    metrics.push({
      key: 'hr',
      label: 'Fréquence cardiaque',
      color: '#e11d48',
      unit: 'bpm',
    });
  if (has.watts)
    metrics.push({
      key: 'watts',
      label: 'Puissance',
      color: '#d97706',
      unit: 'W',
    });
  // Course : allure ; autres : vitesse
  if (has.speed && type === ActivityType.RUN)
    metrics.push({
      key: 'pace',
      label: 'Allure',
      color: '#ea580c',
      unit: '/km',
      format: paceFmt,
    });
  else if (has.speed)
    metrics.push({
      key: 'speed',
      label: 'Vitesse',
      color: '#0891b2',
      unit: 'km/h',
    });
  if (has.cadence)
    metrics.push({
      key: 'cadence',
      label: 'Cadence',
      color: '#7c3aed',
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
                <defs>
                  <linearGradient id={`grad-${m.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="x"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                  tickFormatter={xFmt}
                  tickLine={false}
                  type="number"
                  unit={xLabel === 'km' ? '' : ''}
                />
                <YAxis
                  axisLine={false}
                  domain={m.key === 'pace' ? ['dataMax', 'dataMin'] : ['auto', 'auto']}
                  tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 11 }}
                  tickFormatter={m.format ? (v: number) => m.format!(v) : undefined}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const v = payload[0].value as number;
                    return (
                      <div className="border-border/60 bg-card rounded-lg border px-3 py-2 text-xs shadow-lg">
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
                  fill={`url(#grad-${m.key})`}
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
