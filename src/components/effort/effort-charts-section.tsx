import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { ChartFigure } from '@/components/ui/chart-figure';
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

const PMC_TITLE = 'Charge vs forme — 28 jours';
const WEEKLY_TSS_TITLE = 'Charge hebdomadaire — 8 semaines';

export function EffortPmcSection({ data }: { data: PmcPoint[] }) {
  if (data.length === 0) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>{PMC_TITLE}</DrillDownSectionLabel>
      <ChartFigure
        height={120}
        title={PMC_TITLE}
        series={[
          {
            name: 'Forme chronique',
            points: data.map((d) => ({ label: d.label, value: d.ctl })),
          },
          { name: 'Fatigue aiguë', points: data.map((d) => ({ label: d.label, value: d.atl })) },
          { name: 'Forme nette', points: data.map((d) => ({ label: d.label, value: d.tsb })) },
        ]}
      >
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 2 }}>
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
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
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ChartFigure>
      <details className="group mt-2">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-xs tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
          <span className="underline-offset-2 group-open:no-underline">
            Glossaire CTL / ATL / TSB
          </span>
        </summary>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
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
      <DrillDownSectionLabel>{WEEKLY_TSS_TITLE}</DrillDownSectionLabel>
      <ChartFigure
        height={100}
        title={WEEKLY_TSS_TITLE}
        series={[
          {
            name: 'Charge hebdomadaire',
            unit: 'TSS',
            points: data.map((d) => ({ label: d.week, value: d.tss })),
          },
        ]}
      >
        <BarChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <XAxis
            axisLine={false}
            dataKey="week"
            tick={{ fontSize: 11, fill: CHART_TICK_COLOR }}
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
      </ChartFigure>
      {avgWeeklyTss > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">Moyenne {avgWeeklyTss} TSS/sem</p>
      )}
    </DrillDownSectionCard>
  );
}
