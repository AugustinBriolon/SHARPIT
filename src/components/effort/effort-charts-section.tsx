import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import {
  CHART_BASE_STROKE,
  CHART_CAUTION_STROKE,
  CHART_RECOVERY_STROKE,
  CHART_REFERENCE_LINE,
  CHART_TICK_COLOR,
} from '@/lib/chart-theme';
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
      <DrillDownSectionLabel>PMC — 28 jours</DrillDownSectionLabel>
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
                  <p className="text-muted-foreground">CTL {pt.ctl}</p>
                  <p className="text-muted-foreground">ATL {pt.atl}</p>
                  <p className={pt.tsb >= 0 ? 'text-muted-foreground' : 'text-signal-caution'}>
                    TSB {pt.tsb > 0 ? '+' : ''}
                    {pt.tsb}
                  </p>
                </ChartTooltipCard>
              );
            }}
          />
          <Line
            dataKey="ctl"
            dot={false}
            stroke={CHART_BASE_STROKE}
            strokeWidth={1.5}
            type="monotone"
          />
          <Line
            dataKey="atl"
            dot={false}
            stroke={CHART_CAUTION_STROKE}
            strokeOpacity={0.85}
            strokeWidth={1.5}
            type="monotone"
          />
          <Line
            dataKey="tsb"
            dot={false}
            stroke={CHART_RECOVERY_STROKE}
            strokeDasharray="3 2"
            strokeOpacity={0.8}
            strokeWidth={1}
            type="monotone"
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
        </LineChart>
      </ResponsiveChartFrame>
      <p className="text-muted-foreground/60 mt-2 text-[10px]">
        CTL = forme · ATL = fatigue · TSB = forme − fatigue
      </p>
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
      <DrillDownSectionLabel>TSS hebdomadaire — 8 semaines</DrillDownSectionLabel>
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
