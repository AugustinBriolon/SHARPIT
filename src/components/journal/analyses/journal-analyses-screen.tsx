'use client';

import { BookOpen, ChartLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { useJournalHabitExperiments } from '@/hooks/use-journal-habit-experiments';
import type { JournalAnalysesViewModel } from '@/lib/journal/journal-analyses-view-model';
import type { ObservationPolarity } from '@/lib/journal/journal-habit-analysis';
import { experimentIntentForPolarity } from '@/lib/journal/journal-habit-experiment';
import {
  splitExperimentViews,
  type HabitExperimentView,
} from '@/lib/journal/journal-habit-experiment-view';
import type { JournalHabitReading } from '@/lib/journal/journal-habit-reading';
import { AssociationPanel } from './association-panel';
import { CoachReadingCta } from './coach-reading-cta';
import { RunningExperimentBanner } from './experiments-panel';
import { RunningTestStatus, StartTestButton } from './start-test-button';
import { TakeawayPlate } from './takeaway-plate';

export type JournalAnalysesData = {
  reading: JournalHabitReading;
  viewModel: JournalAnalysesViewModel;
};

export function JournalAnalysesScreen({
  daysWithSignal,
  minDays,
  analysis,
  experiments,
  isPro,
}: {
  daysWithSignal: number;
  minDays: number;
  /** Null until the analysis unlocks (`minDays` days with a journal signal). */
  analysis: JournalAnalysesData | null;
  experiments: HabitExperimentView[];
  isPro: boolean;
}) {
  return analysis ? (
    <JournalAnalysesReady analysis={analysis} experiments={experiments} isPro={isPro} />
  ) : (
    <JournalAnalysesNotReady daysWithSignal={daysWithSignal} minDays={minDays} />
  );
}

function JournalAnalysesNotReady({
  daysWithSignal,
  minDays,
}: {
  daysWithSignal: number;
  minDays: number;
}) {
  const remaining = Math.max(0, minDays - daysWithSignal);
  const progress = Math.min(1, daysWithSignal / minDays);

  return (
    <div className="space-y-3">
      <InkEmptyState
        description={`Il faut ${minDays} jours avec au moins un signal journal avant d’ouvrir les lectures.`}
        icon={ChartLine}
        title="Pas encore assez de données"
        action={
          <LinkButton href="/journal" size="sm" variant="outline">
            <BookOpen className="size-3.5" aria-hidden />
            Retour au journal
          </LinkButton>
        }
      />
      <div className="px-1">
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-muted-foreground text-data mt-2 text-center text-xs tabular-nums">
          {daysWithSignal} / {minDays} jours
          {remaining > 0 ? ` · encore ${remaining}` : ''}
        </p>
      </div>
    </div>
  );
}

/** One lever at a time: hide start CTAs while a test runs; morph the active one. */
function useTestActions(initial: HabitExperimentView[]) {
  const { experiments, start, stop } = useJournalHabitExperiments(initial);
  const { running } = splitExperimentViews(experiments);

  const renderStart = (factorId: string, polarity: ObservationPolarity): ReactNode => {
    if (running) {
      if (running.factorId !== factorId) {
        return null;
      }
      return <RunningTestStatus progressLabel={running.progressLabel} title={running.title} />;
    }
    return (
      <StartTestButton
        error={start.error?.message ?? null}
        pending={start.isPending}
        onStart={() => start.mutate({ factorId, intent: experimentIntentForPolarity(polarity) })}
      />
    );
  };

  return {
    renderStart,
    running,
    stopping: stop.isPending,
    error: (start.error ?? stop.error)?.message ?? null,
    onStop: (id: string) => stop.mutate(id),
  };
}

/** Single causal column: plate → optional live test → associations. */
function JournalAnalysesReady({
  analysis,
  experiments,
  isPro,
}: {
  analysis: JournalAnalysesData;
  experiments: HabitExperimentView[];
  isPro: boolean;
}) {
  const { reading, viewModel } = analysis;
  const { renderStart, running, stopping, error, onStop } = useTestActions(experiments);
  const { priority } = reading;

  // When a test runs, the banner above is the source of truth — no duplicate CTA.
  let plateExperience: ReactNode | undefined;
  if (!running) {
    plateExperience = (
      <>
        <p className="text-sm text-pretty">{reading.actionHint}</p>
        {priority ? renderStart(priority.factorId, priority.polarity) : null}
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <TakeawayPlate experience={plateExperience} reading={reading} />
      {running ? (
        <RunningExperimentBanner
          error={error}
          experiment={running}
          stopping={stopping}
          onStop={onStop}
        />
      ) : null}
      <AssociationPanel
        vm={viewModel}
        actionsFor={(row) => {
          const start = renderStart(row.factorId, row.polarity);
          return (
            <>
              {start}
              <CoachReadingCta isPro={isPro} />
            </>
          );
        }}
      />
    </div>
  );
}
