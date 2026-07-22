'use client';

import { ActivityType } from '@prisma/client';
import { memo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatAltitudeMeters,
  type NormalizedStreamChartPoint,
} from '@/lib/streams/stream-chart-data';
import {
  CHART_GRID_COLOR,
  CHART_RECOVERY_STROKE,
  CHART_RISK_STROKE,
  CHART_THRESHOLD_STROKE,
  CHART_TICK_COLOR,
} from '@/lib/theme/chart-theme';

function CombinedChartComponent({
  samples,
  has,
  type,
}: {
  samples: NormalizedStreamChartPoint[];
  has: { distance: boolean; altitude: boolean; hr: boolean; watts: boolean };
  type: ActivityType;
}) {
  const useDistance = has.distance;
  const showAlt = has.altitude && has.hr;
  const showPower = has.watts && has.hr && type === ActivityType.BIKE;

  if (!showAlt && !showPower) return null;

  const secondaryKey = showPower ? 'watts' : 'alt';
  const secondaryLabel = showPower ? 'Puissance (W)' : 'Altitude (m)';
  const secondaryColor = showPower ? CHART_THRESHOLD_STROKE : CHART_RECOVERY_STROKE;

  const data = samples.map((point) => ({
    x: useDistance ? Number(point.xDistanceKm.toFixed(2)) : Number(point.xTimeMin.toFixed(1)),
    hr: point.hr,
    [secondaryKey]: showPower ? point.watts : point.alt,
  }));

  const xLabel = useDistance ? 'km' : 'min';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          FC + {showPower ? 'puissance' : 'altitude'}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Corrélation effort / réponse cardiovasculaire
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveChartFrame height={208}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              tick={{ fill: CHART_RISK_STROKE, fontSize: 11 }}
              tickLine={false}
              width={36}
              yAxisId="hr"
            />
            <YAxis
              axisLine={false}
              orientation="right"
              tick={{ fill: secondaryColor, fontSize: 11 }}
              tickFormatter={showPower ? undefined : formatAltitudeMeters}
              tickLine={false}
              width={40}
              yAxisId="sec"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="analysis-panel rounded-analysis px-3 py-2 text-xs shadow-none">
                    <p className="text-muted-foreground mb-1">
                      {label} {xLabel}
                    </p>
                    {payload.map((p) => {
                      const raw = p.value as number;
                      const formatted =
                        p.dataKey === secondaryKey && !showPower ? formatAltitudeMeters(raw) : raw;
                      return (
                        <p key={String(p.dataKey)} style={{ color: p.color }}>
                          {p.dataKey === 'hr' ? 'FC' : secondaryLabel.split(' ')[0]}:{' '}
                          <span className="font-mono font-semibold">{formatted}</span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Line
              dataKey="hr"
              dot={false}
              isAnimationActive={false}
              stroke={CHART_RISK_STROKE}
              strokeWidth={2}
              type="monotone"
              yAxisId="hr"
              connectNulls
            />
            <Line
              dataKey={secondaryKey}
              dot={false}
              isAnimationActive={false}
              stroke={secondaryColor}
              strokeWidth={2}
              type="monotone"
              yAxisId="sec"
              connectNulls
            />
          </LineChart>
        </ResponsiveChartFrame>
      </CardContent>
    </Card>
  );
}

export const CombinedChart = memo(CombinedChartComponent);
