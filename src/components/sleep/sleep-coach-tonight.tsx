import { MetricCell } from '@/components/ui/metric-cell';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep';

export function SleepCoachTonight({ view }: { view: SleepCoachView }) {
  if (!view.hasData) return null;

  const durationLabel =
    view.recommendedDurationMin > view.targetDurationMin
      ? formatDuration(view.recommendedDurationMin)
      : formatDuration(view.targetDurationMin);

  const debtProgress =
    view.debt7Min != null && view.debt7Min > 0
      ? Math.min(100, Math.round((view.debt7Min / 180) * 100))
      : null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Que faire ce soir</DrillDownSectionLabel>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground text-xs">Coucher conseillé</p>
            <p className="text-data text-foreground mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              {view.recommendedBedtimeMin != null ? formatClock(view.recommendedBedtimeMin) : '—'}
            </p>
          </div>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            Vise {durationLabel} avant ton réveil habituel
            {view.regularityMin != null && ` · régularité ±${view.regularityMin} min`}.
          </p>
          {debtProgress != null ? (
            <div className="max-w-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Dette de sommeil</span>
                <span className="text-data text-foreground font-medium">
                  {formatDuration(view.debt7Min!)}
                </span>
              </div>
              <div className="bg-muted/80 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-signal-caution h-full rounded-full"
                  style={{ width: `${debtProgress}%` }}
                />
              </div>
            </div>
          ) : null}
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
