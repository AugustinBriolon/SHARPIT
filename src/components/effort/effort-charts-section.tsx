import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import {
  CHART_BASE_STROKE,
  CHART_CAUTION_STROKE,
  CHART_REFERENCE_LINE,
  CHART_TICK_COLOR,
} from '@/lib/theme/chart-theme';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

type PmcPoint = { label: string; ctl: number; atl: number; tsb: number };
type WeeklyTssPoint = { week: string; tss: number };

export function EffortPmcSection({ data }: { data: PmcPoint[] }) {
  if (data.length === 0) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Charge vs forme — 28 jours</DrillDownSectionLabel>
      <ResponsiveChartFrame height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 2 }}>
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fontSize: 9, fill: CHART_TICK_COLOR }}
            tickLine={false}
          />
          <YAxis hide />
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} vertical={false} />
          <ReferenceLine stroke={CHART_REFERENCE_LINE} y={0} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0]?.payload as PmcPoint;
              return (
                <ChartTooltipCard>
                  <p className="font-medium">{pt.label}</p>
                  <p className="text-muted-foreground">Forme chronique {pt.ctl}</p>
                  <p className="text-muted-foreground">Fatigue aiguë {pt.atl}</p>
                  <p className={pt.tsb >= 0 ? 'text-muted-foreground' : 'text-signal-caution'}>
                    Forme nette {pt.tsb > 0 ? '+' : ''}
                    {pt.tsb}
                  </p>
                </ChartTooltipCard>
              );
            }}
          />
          <Line
            dataKey="ctl"
            dot={false}
            name="Forme chronique"
            stroke={CHART_BASE_STROKE}
            strokeWidth={1.5}
            type="monotone"
          />
          <Line
            dataKey="atl"
            dot={false}
            name="Fatigue aiguë"
            stroke={CHART_CAUTION_STROKE}
            strokeOpacity={0.85}
            strokeWidth={1.5}
            type="monotone"
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
        </LineChart>
      </ResponsiveChartFrame>
      <details className="group mt-2">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-[10px] tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
          <span className="underline-offset-2 group-open:no-underline">
            Glossaire CTL / ATL / TSB
          </span>
        </summary>
        <p className="text-muted-foreground/80 mt-1.5 text-[10px] leading-relaxed">
          CTL = forme chronique · ATL = fatigue aiguë · TSB = forme nette (CTL − ATL)
        </p>
      </details>
    </DrillDownSectionCard>
  );
}

export function EffortWeeklyTssSection({
  data,
  avgWeeklyTss,
}: {
  data: WeeklyTssPoint[];
  avgWeeklyTss: number;
}) {
  if (!data.some((w) => w.tss > 0)) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Charge hebdomadaire — 8 semaines</DrillDownSectionLabel>
      <ResponsiveChartFrame height={100}>
        <BarChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <XAxis
            axisLine={false}
            dataKey="week"
            tick={{ fontSize: 9, fill: CHART_TICK_COLOR }}
            tickLine={false}
          />
          <YAxis hide />
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} vertical={false} />
          {avgWeeklyTss > 0 && (
            <ReferenceLine stroke={CHART_REFERENCE_LINE} strokeDasharray="3 3" y={avgWeeklyTss} />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const pt = payload[0].payload as WeeklyTssPoint;
              return (
                <ChartTooltipCard>
                  <p className="text-data font-semibold tabular-nums">{pt.tss} TSS</p>
                  <p className="text-muted-foreground">{pt.week}</p>
                </ChartTooltipCard>
              );
            }}
          />
          <Bar dataKey="tss" fill={CHART_BASE_STROKE} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveChartFrame>
      {avgWeeklyTss > 0 && (
        <p className="text-muted-foreground/60 mt-2 text-[10px]">Moyenne {avgWeeklyTss} TSS/sem</p>
      )}
    </DrillDownSectionCard>
  );
}
