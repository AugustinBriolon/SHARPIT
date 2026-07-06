import { MetricCell } from '@/components/ui/metric-cell';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { SleepSectionLabel } from '@/components/sleep/sleep-section-label';
import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep';

export function SleepCoachTonight({ view }: { view: SleepCoachView }) {
  if (!view.hasData) return null;

  const durationLabel =
    view.recommendedDurationMin > view.targetDurationMin
      ? formatDuration(view.recommendedDurationMin)
      : formatDuration(view.targetDurationMin);

  return (
    <DrillDownSectionCard>
      <SleepSectionLabel>Ce soir</SleepSectionLabel>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs">Coucher conseillé</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-[#1e3a8a] tabular-nums">
            {view.recommendedBedtimeMin != null ? formatClock(view.recommendedBedtimeMin) : '—'}
          </p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            Vise {durationLabel} avant ton réveil habituel
            {view.regularityMin != null && ` · régularité ±${view.regularityMin} min`}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCell
            label="Moy. 7j"
            layout="compact"
            value={formatDuration(view.avg.durationMin)}
          />
          <MetricCell
            label="Profond moy."
            layout="compact"
            value={view.avg.deepPct != null ? `${view.avg.deepPct} %` : '—'}
          />
          <MetricCell
            label="Dette 7j"
            layout="compact"
            tone={view.debt7Min != null && view.debt7Min > 60 ? 'warn' : 'neutral'}
            value={
              view.debt7Min != null && view.debt7Min > 30 ? formatDuration(view.debt7Min) : '—'
            }
          />
        </div>
      </div>
    </DrillDownSectionCard>
  );
}
