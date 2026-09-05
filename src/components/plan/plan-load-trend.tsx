import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PlanLoadTrend } from '@/lib/plan/plan-load-trend';
import type { RulerBar } from '@/lib/training/thread/load-ruler';

function barFillPercent(bar: RulerBar): number {
  if (bar.unmeasured || bar.load <= 0) {
    return 0;
  }
  return Math.max(bar.height * 100, 18);
}

function WeekWell({ bar }: { bar: RulerBar }) {
  const fill = barFillPercent(bar);

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div
        className="bg-analysis-border/20 flex h-20 w-full items-end overflow-hidden rounded-md"
        aria-hidden
      >
        {bar.unmeasured ? (
          <span className="bg-analysis-border/60 h-1 w-full" />
        ) : bar.state === 'future' ? (
          <span
            className="border-analysis-border w-full border border-dashed bg-transparent"
            style={{ height: `${Math.max(fill, 12)}%` }}
          />
        ) : fill > 0 ? (
          <span
            style={{ height: `${fill}%` }}
            className={cn(
              'w-full rounded-sm',
              bar.state === 'current' ? 'bg-primary' : 'bg-foreground/75',
            )}
          />
        ) : null}
      </div>
      <span className="text-label truncate">{bar.label}</span>
    </li>
  );
}

function AdherenceLine({ trend }: { trend: PlanLoadTrend }) {
  if (trend.adherence.ratio === null) {
    return null;
  }
  const percent = Math.round(trend.adherence.ratio * 100);
  return (
    <p className="text-foreground text-sm leading-relaxed">
      {trend.adherence.completed} séances tenues sur {trend.adherence.prescribed} ({percent} %).
      {trend.adherence.worstWeekLabel ? ` Plus faible en ${trend.adherence.worstWeekLabel}.` : null}
    </p>
  );
}

function TrendBars({ trend }: { trend: PlanLoadTrend }) {
  return (
    <div className="space-y-3">
      <ol className="flex items-end gap-2">
        {trend.bars.map((bar) => (
          <WeekWell key={bar.weekKey} bar={bar} />
        ))}
      </ol>
      <AdherenceLine trend={trend} />
    </div>
  );
}

export function PlanLoadTrendSection({
  trend,
  compact = false,
  framed = true,
}: {
  trend: PlanLoadTrend;
  compact?: boolean;
  framed?: boolean;
}) {
  return (
    <section aria-labelledby="plan-load-trend" className="space-y-2">
      {compact ? null : (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section-title" id="plan-load-trend">
            4 dernières semaines
          </h2>
          <Link className="explore-link shrink-0" href="/activite">
            Historique
          </Link>
        </div>
      )}
      {compact ? (
        <p className="sr-only" id="plan-load-trend">
          4 dernières semaines
        </p>
      ) : null}
      {framed ? (
        <div className="analysis-panel rounded-analysis-lg px-4 py-3.5">
          <TrendBars trend={trend} />
        </div>
      ) : (
        <TrendBars trend={trend} />
      )}
    </section>
  );
}

export function PlanLoadTrendSkeleton() {
  return <div className="analysis-panel-alt rounded-analysis-lg h-28 animate-pulse" aria-busy />;
}
