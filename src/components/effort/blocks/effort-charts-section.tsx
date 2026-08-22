import { TermInfo } from '@/components/ui/term-info';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { ChartTooltipCard } from '@/components/ui/charts/chart-tooltip';
import { ChartFigure } from '@/components/ui/charts/chart-figure';
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
      {/* The definitions sit on the terms rather than in a fold beneath the chart:
          the acronym is read while looking at its curve, not two scrolls later. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <DrillDownSectionLabel className="mb-0">{PMC_TITLE}</DrillDownSectionLabel>
        <span className="text-muted-foreground flex items-center gap-2 text-xs leading-none">
          <span className="inline-flex items-center gap-1">
            Forme chronique
            <TermInfo term="ctl" />
          </span>
          <span className="inline-flex items-center gap-1">
            Fatigue aiguë
            <TermInfo term="atl" />
          </span>
          <span className="inline-flex items-center gap-1">
            Forme nette
            <TermInfo term="tsb" />
          </span>
        </span>
      </div>
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
            isAnimationActive={false}
            name="Forme chronique"
            stroke={CHART_BASE_STROKE}
            strokeWidth={2}
            type="monotone"
          />
          <Line
            dataKey="atl"
            dot={false}
            name="Fatigue aiguë"
            // Two series at 1.58:1 cannot be told apart by hue: the dash is the
            // channel that survives a colour-blind reader and a dim screen alike.
            // Recharts animates stroke-dasharray, so its animation must be off or it
            // overwrites the pattern and leaves the line at zero length.
            isAnimationActive={false}
            stroke={CHART_CAUTION_STROKE}
            strokeDasharray="5 3"
            strokeWidth={2}
            type="monotone"
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ChartFigure>
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
      <div className="mb-3 flex items-center gap-1.5">
        <DrillDownSectionLabel className="mb-0">{WEEKLY_TSS_TITLE}</DrillDownSectionLabel>
        <TermInfo term="tss" />
      </div>
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
