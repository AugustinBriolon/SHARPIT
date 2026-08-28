import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { SleepNightStatus } from '@/core/presentation/sleep-view-model';
import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep/sleep';
import { tonightReason } from '@/lib/sleep/tonight-reason';
import { cn } from '@/lib/utils';

const RELAXATION_LEAD_MIN = 30;

/**
 * Tonight's plan, and the one fact that justifies it.
 *
 * A "Pourquoi" section used to sit beside the night structure explaining the night
 * that had just ended — a paragraph about the past on a screen read in the
 * evening. The same fact is useful as the reason this bedtime is being proposed,
 * so it lives under the plan now and the section is gone.
 */
export function SleepCoachTonight({
  view,
  nightStatus = 'present',
  restorativeRatio = null,
  targetDeltaMin = null,
  asPanel = false,
}: {
  view: SleepCoachView;
  nightStatus?: SleepNightStatus;
  restorativeRatio?: number | null;
  targetDeltaMin?: number | null;
  /** Wrap in an analysis panel for the 2-col composition beside night structure. */
  asPanel?: boolean;
}) {
  if (!view.hasData) {
    return null;
  }

  const bedtime = view.recommendedBedtimeMin;
  const durationMin = Math.max(view.recommendedDurationMin, view.targetDurationMin);
  const hasPlan = bedtime !== null && durationMin > 0;

  const relaxation = bedtime !== null ? bedtime - RELAXATION_LEAD_MIN : null;
  const wake = bedtime !== null && durationMin > 0 ? bedtime + durationMin : null;

  const secondaryNote = tonightReason({
    debt7Min: view.debt7Min,
    nightStatus,
    regularityMin: view.regularityMin,
    restorativeRatio,
    targetDeltaMin,
  });

  const body = (
    <>
      {hasPlan ? (
        <div className="space-y-3">
          <div>
            <p className="text-label">Coucher conseillé</p>
            <p className="text-data text-foreground mt-1.5 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {formatClock(bedtime)}
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Vise {formatDuration(durationMin)}
              {wake !== null ? ` · réveil ~${formatClock(wake % 1440)}` : ''}
              {relaxation !== null ? ` · détente dès ${formatClock(relaxation)}` : ''}.
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
    </>
  );

  return (
    <DrillDownSectionCard className={asPanel ? 'h-full' : undefined}>
      <DrillDownSectionLabel>Ce soir</DrillDownSectionLabel>
      {body}
    </DrillDownSectionCard>
  );
}
