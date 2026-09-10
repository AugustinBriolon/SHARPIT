'use client';

import { useId } from 'react';
import { ExperimentDaySegments } from '@/components/journal/analyses/experiment-day-segments';
import { FadeIn } from '@/components/motion';
import { Button } from '@/components/ui/button';
import type { HabitExperimentView } from '@/lib/health/journal-habit-experiment-view';

/**
 * Live 7-day test only. History and empty states stay off the page —
 * if nothing is running, the caller renders nothing.
 */
export function RunningExperimentBanner({
  experiment,
  stopping,
  error,
  onStop,
}: {
  experiment: HabitExperimentView;
  stopping: boolean;
  error: string | null;
  onStop: (id: string) => void;
}) {
  const titleId = useId();

  return (
    <FadeIn>
      <section aria-labelledby={titleId} className="analysis-panel space-y-3 px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-pretty" id={titleId}>
            {experiment.title}
          </h2>
          <p className="text-data shrink-0 text-sm">{experiment.progressLabel}</p>
        </div>
        <ExperimentDaySegments
          label={`${experiment.heldLabel} sur 7, ${experiment.progressLabel}`}
          segments={experiment.segments}
        />
        <p className="text-muted-foreground text-data text-xs">
          {experiment.heldLabel} · {experiment.reviewLabel}
        </p>
        <Button
          className="min-h-11 sm:min-h-8"
          disabled={stopping}
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onStop(experiment.id)}
        >
          Arrêter le test
        </Button>
        {error ? (
          <p className="text-signal-caution text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </FadeIn>
  );
}
