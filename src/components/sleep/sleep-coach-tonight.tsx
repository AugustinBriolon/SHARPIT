import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep/sleep';
import { cn } from '@/lib/utils';

const RELAXATION_LEAD_MIN = 30;

/**
 * Plan du soir — coucher dominant; relaxation + réveil en mono secondaire.
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

  // Debt lives in SleepWhyBlock — avoid repeating here unless no why primary.
  const secondaryNote =
    coachingLine ??
    (view.regularityMin != null
      ? `Régularité ±${view.regularityMin} min autour du réveil habituel.`
      : null);

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Ce soir</DrillDownSectionLabel>

      {hasPlan ? (
        <div className="space-y-3">
          <div>
            <p className="text-label">Coucher conseillé</p>
            <p className="text-data text-foreground mt-1.5 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {formatClock(bedtime)}
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Vise {formatDuration(durationMin)}
              {wake != null ? ` · réveil ~${formatClock(wake % 1440)}` : ''}
              {relaxation != null ? ` · détente dès ${formatClock(relaxation)}` : ''}.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pas encore assez d’historique pour proposer une fenêtre de coucher.
        </p>
      )}

      {secondaryNote ? (
        <p
          className={cn(
            'text-muted-foreground text-sm leading-relaxed',
            hasPlan ? 'pt-3' : undefined,
          )}
        >
          {secondaryNote}
        </p>
      ) : null}
    </DrillDownSectionCard>
  );
}
