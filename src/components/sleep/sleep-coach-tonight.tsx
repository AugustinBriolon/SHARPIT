import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep';
import { cn } from '@/lib/utils';

const RELAXATION_LEAD_MIN = 30;

/**
 * Plan du soir — trois heures clés + durée cible.
 * Pas de barre : les heures portent déjà toute l'information.
 */
export function SleepCoachTonight({
  view,
  coachingLine,
}: {
  view: SleepCoachView;
  coachingLine?: string | null;
}) {
  if (!view.hasData) return null;

  const bedtime = view.recommendedBedtimeMin;
  const durationMin = Math.max(view.recommendedDurationMin, view.targetDurationMin);
  const hasPlan = bedtime != null && durationMin > 0;

  const relaxation = bedtime != null ? bedtime - RELAXATION_LEAD_MIN : null;
  const wake = bedtime != null && durationMin > 0 ? bedtime + durationMin : null;

  const debtMin = view.debt7Min != null && view.debt7Min > 30 ? view.debt7Min : null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Ce soir</DrillDownSectionLabel>

      {hasPlan ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3">
            <div>
              <p className="text-label">Relaxation</p>
              <p className="text-data text-muted-foreground mt-1.5 text-xl font-medium tabular-nums sm:text-2xl">
                {relaxation != null ? formatClock(relaxation) : '—'}
              </p>
            </div>
            <div className="border-analysis-border/50 border-l pl-4">
              <p className="text-label">Coucher conseillé</p>
              <p className="text-data text-foreground mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">
                {formatClock(bedtime)}
              </p>
            </div>
            <div className="border-analysis-border/50 border-l pl-4">
              <p className="text-label">Réveil</p>
              <p className="text-data text-muted-foreground mt-1.5 text-xl font-medium tabular-nums sm:text-2xl">
                {wake != null ? formatClock(wake % 1440) : '—'}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed">
            Vise {formatDuration(durationMin)} avant ton réveil habituel
            {view.regularityMin != null ? ` · régularité ±${view.regularityMin} min` : ''}.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pas encore assez d’historique pour proposer une fenêtre de coucher.
        </p>
      )}

      {debtMin != null || coachingLine ? (
        <div className="space-y-2 pt-4">
          {debtMin != null ? (
            <p className="annotation-clinical">
              Dette 7 jours{' '}
              <span
                className={cn(
                  'text-data font-medium tabular-nums',
                  debtMin > 90 ? 'text-signal-caution' : 'text-foreground',
                )}
              >
                {formatDuration(debtMin)}
              </span>{' '}
              — à résorber sur les prochaines nuits.
            </p>
          ) : null}
          {coachingLine ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{coachingLine}</p>
          ) : null}
        </div>
      ) : null}
    </DrillDownSectionCard>
  );
}
