import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import { ChartFigure } from '@/components/ui/charts/chart-figure';
import { CHART_RECOVERY_STROKE } from '@/lib/theme/chart-theme';
import { cn } from '@/lib/utils';
import { Line, LineChart, ReferenceArea, Tooltip, XAxis, YAxis } from 'recharts';

export type SparkPoint = { date: string; value: number | null };

function isDeltaFavorable(delta: number, invertDelta?: boolean): boolean {
  return invertDelta ? delta < 0 : delta > 0;
}

function computeSparkDelta(valid: SparkPoint[]) {
  const last = valid[valid.length - 1]?.value ?? null;
  const prev7 =
    valid.length >= 7
      ? valid.slice(-8, -1).reduce((sum, point) => sum + (point.value ?? 0), 0) /
        Math.min(7, valid.slice(-8, -1).length)
      : null;
  if (last === null || prev7 === null) {
    return null;
  }
  return Math.round(last - prev7);
}

function SparklineTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: SparkPoint }[];
  unit: string;
}) {
  if (!active || !payload?.[0]) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <ChartTooltipCard>
      <p className="font-semibold tabular-nums">
        {point.value !== null ? `${point.value} ${unit}` : '—'}
      </p>
      <p className="text-muted-foreground">{point.date}</p>
    </ChartTooltipCard>
  );
}

function SparklineValueHeader({
  delta,
  invertDelta,
  last,
  unit,
}: {
  delta: number | null;
  invertDelta?: boolean;
  last: number | null;
  unit: string;
}) {
  const deltaGood = delta !== null ? isDeltaFavorable(delta, invertDelta) : null;

  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xl font-bold tabular-nums">
        {last !== null ? last : '—'}
        <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
      </span>
      {delta !== null ? (
        <span
          className={cn(
            'text-data text-xs font-medium tabular-nums',
            deltaGood ? 'text-muted-foreground' : 'text-signal-caution',
          )}
        >
          {delta > 0 ? '+' : ''}
          {delta} vs 7j
        </span>
      ) : null}
    </div>
  );
}

export function MiniSparkline({
  data,
  color,
  unit,
  label,
  invertDelta,
  baselineLow,
  baselineHigh,
}: {
  data: SparkPoint[];
  color: string;
  unit: string;
  label: string;
  invertDelta?: boolean;
  baselineLow?: number | null;
  baselineHigh?: number | null;
}) {
  const valid = data.filter((point) => point.value !== null);
  if (valid.length < 2) {
    return <p className="text-muted-foreground text-sm">Pas de données</p>;
  }

  const last = valid[valid.length - 1]?.value ?? null;
  const delta = computeSparkDelta(valid);

  return (
    <div className="space-y-2">
      <SparklineValueHeader delta={delta} invertDelta={invertDelta} last={last} unit={unit} />
      <ChartFigure
        height={64}
        title={`${label} — 14 jours`}
        series={[
          {
            name: label,
            unit,
            points: data.map((point) => ({ label: point.date, value: point.value })),
          },
        ]}
      >
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip content={(props) => <SparklineTooltip {...props} unit={unit} />} />
          {baselineLow !== null && baselineHigh !== null ? (
            <ReferenceArea
              fill={CHART_RECOVERY_STROKE}
              fillOpacity={0.12}
              y1={baselineLow}
              y2={baselineHigh}
            />
          ) : null}
          <Line dataKey="value" dot={false} stroke={color} strokeWidth={1.5} type="monotone" />
        </LineChart>
      </ChartFigure>
    </div>
  );
}
