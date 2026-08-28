import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import {
  MiniSparkline,
  type SparkPoint,
} from '@/components/recovery/blocks/recovery-mini-sparkline';
import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import { ChartFigure } from '@/components/ui/charts/chart-figure';
import { CHART_CAUTION_STROKE, CHART_RECOVERY_STROKE } from '@/lib/theme/chart-theme';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

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
  if (!hasData) {
    return <p className="text-muted-foreground text-sm">Pas de données</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs">
          <span className="size-2 rounded-full" style={{ background: colorA }} aria-hidden />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="size-2 rounded-full" style={{ background: colorB }} aria-hidden />
          {labelB}
        </span>
      </div>
      <ChartFigure
        height={64}
        title={`${labelA} et ${labelB} — 14 jours`}
        series={[
          {
            name: labelA,
            unit: unitA || undefined,
            points: data.map((d) => ({ label: d.date, value: d.a })),
          },
          {
            name: labelB,
            unit: unitB || undefined,
            points: data.map((d) => ({ label: d.date, value: d.b })),
          },
        ]}
      >
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }
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
      </ChartFigure>
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
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">VFC</h3>
          <MiniSparkline
            baselineHigh={baselineHigh}
            baselineLow={baselineLow}
            color={CHART_RECOVERY_STROKE}
            data={sparkHrv}
            label="VFC"
            unit="ms"
          />
          {baselineLow !== null && baselineHigh !== null && (
            <p className="text-muted-foreground mt-1 text-xs">
              Zone = norme personnelle ({baselineLow}–{baselineHigh} ms)
            </p>
          )}
        </div>
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">FC repos</h3>
          <MiniSparkline
            color={CHART_CAUTION_STROKE}
            data={sparkRhr}
            label="FC repos"
            unit="bpm"
            invertDelta
          />
        </div>
        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">Énergie &amp; stress</h3>
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
