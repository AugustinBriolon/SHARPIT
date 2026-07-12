import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { CHART_CAUTION_STROKE, CHART_RECOVERY_STROKE } from '@/lib/chart-theme';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from 'recharts';

type SparkPoint = { date: string; value: number | null };

function isDeltaFavorable(delta: number, invertDelta?: boolean): boolean {
  return invertDelta ? delta < 0 : delta > 0;
}

function MiniSparkline({
  data,
  color,
  unit,
  invertDelta,
  baselineLow,
  baselineHigh,
}: {
  data: SparkPoint[];
  color: string;
  unit: string;
  invertDelta?: boolean;
  baselineLow?: number | null;
  baselineHigh?: number | null;
}) {
  const valid = data.filter((d) => d.value !== null);
  if (valid.length < 2) {
    return <p className="text-muted-foreground text-sm">Pas de données</p>;
  }

  const last = valid[valid.length - 1]?.value ?? null;
  const prev7 =
    valid.length >= 7
      ? valid.slice(-8, -1).reduce((s, d) => s + (d.value ?? 0), 0) /
        Math.min(7, valid.slice(-8, -1).length)
      : null;
  const delta = last !== null && prev7 !== null ? Math.round(last - prev7) : null;
  const deltaGood = delta !== null ? isDeltaFavorable(delta, invertDelta) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-bold tabular-nums">
          {last !== null ? last : '—'}
          <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
        </span>
        {delta !== null && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              deltaGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta} vs 7j
          </span>
        )}
      </div>
      <ResponsiveChartFrame height={64}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const pt = payload[0].payload as SparkPoint;
              return (
                <ChartTooltipCard>
                  <p className="font-semibold tabular-nums">
                    {pt.value !== null ? `${pt.value} ${unit}` : '—'}
                  </p>
                  <p className="text-muted-foreground">{pt.date}</p>
                </ChartTooltipCard>
              );
            }}
          />
          {baselineLow != null && baselineHigh != null && (
            <ReferenceArea
              fill={CHART_RECOVERY_STROKE}
              fillOpacity={0.12}
              y1={baselineLow}
              y2={baselineHigh}
            />
          )}
          <Line dataKey="value" dot={false} stroke={color} strokeWidth={1.5} type="monotone" />
        </LineChart>
      </ResponsiveChartFrame>
    </div>
  );
}

function DualSparkline({
  data,
  colorA,
  colorB,
  labelA,
  labelB,
  unitA,
  unitB,
}: {
  data: { date: string; a: number | null; b: number | null }[];
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
  unitA: string;
  unitB: string;
}) {
  const hasData = data.some((d) => d.a !== null || d.b !== null);
  if (!hasData) return <p className="text-muted-foreground text-sm">Pas de données</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[10px]">
          <span className="size-2 rounded-full" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5 text-[10px]">
          <span className="size-2 rounded-full" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <ResponsiveChartFrame height={64}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0]?.payload as {
                date: string;
                a: number | null;
                b: number | null;
              };
              return (
                <ChartTooltipCard>
                  {pt.a !== null && (
                    <p>
                      {labelA}: {pt.a}
                      {unitA}
                    </p>
                  )}
                  {pt.b !== null && (
                    <p>
                      {labelB}: {pt.b}
                      {unitB}
                    </p>
                  )}
                  <p className="text-muted-foreground">{pt.date}</p>
                </ChartTooltipCard>
              );
            }}
          />
          <Line dataKey="a" dot={false} stroke={colorA} strokeWidth={1.5} type="monotone" />
          <Line dataKey="b" dot={false} stroke={colorB} strokeWidth={1.5} type="monotone" />
        </LineChart>
      </ResponsiveChartFrame>
    </div>
  );
}

export function RecoveryTrendsSection({
  sparkHrv,
  sparkRhr,
  dualData,
  baselineLow,
  baselineHigh,
}: {
  sparkHrv: SparkPoint[];
  sparkRhr: SparkPoint[];
  dualData: { date: string; a: number | null; b: number | null }[];
  baselineLow: number | null;
  baselineHigh: number | null;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Tendances qui confirment ou nuancent</DrillDownSectionLabel>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">VFC</p>
          <MiniSparkline
            baselineHigh={baselineHigh}
            baselineLow={baselineLow}
            color={CHART_RECOVERY_STROKE}
            data={sparkHrv}
            unit="ms"
          />
          {baselineLow != null && baselineHigh != null && (
            <p className="text-muted-foreground/60 mt-1 text-[10px]">
              Zone verte = norme personnelle ({baselineLow}–{baselineHigh} ms)
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">FC repos</p>
          <MiniSparkline color={CHART_CAUTION_STROKE} data={sparkRhr} unit="bpm" invertDelta />
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Énergie & stress</p>
          <DualSparkline
            colorA={CHART_RECOVERY_STROKE}
            colorB={CHART_CAUTION_STROKE}
            data={dualData}
            labelA="Batterie"
            labelB="Stress"
            unitA=""
            unitB=""
          />
        </div>
      </div>
    </DrillDownSectionCard>
  );
}
