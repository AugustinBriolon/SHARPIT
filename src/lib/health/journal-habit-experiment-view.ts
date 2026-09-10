/**
 * Athlete-facing view of 7-day habit experiments: title, progress, review date,
 * three-state verdict and the measured gaps. Presentation only.
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { JournalOutcomeKey } from '@/lib/health/journal-habit-analysis';
import type {
  EvaluatedExperiment,
  ExperimentDaySegment,
  ExperimentIntent,
  ExperimentVerdict,
} from '@/lib/health/journal-habit-experiment';
import { EXPERIMENT_WINDOW_DAYS } from '@/lib/health/journal-habit-experiment';
import {
  formatSignedDelta,
  journalFactorDisplayLabel,
} from '@/lib/health/journal-habit-finding-copy';

export type HabitExperimentView = {
  id: string;
  factorId: string;
  title: string;
  status: 'running' | 'reviewed';
  progressLabel: string;
  segments: ExperimentDaySegment[];
  heldLabel: string;
  reviewLabel: string;
  verdict: ExperimentVerdict | null;
  verdictLabel: string | null;
  deltaLine: string | null;
};

export const EXPERIMENT_VERDICT_LABELS: Record<ExperimentVerdict, string> = {
  worked: 'a marché',
  no_effect: 'sans effet',
  abandoned: 'abandonné',
};

const SHORT_OUTCOME_LABELS: Record<JournalOutcomeKey, string> = {
  sleepMinutes: 'sommeil',
  recoveryScore: 'récup',
  bodyBattery: 'Body Battery',
};

export function experimentTitle(intent: ExperimentIntent, factorId: string): string {
  const habit = journalFactorDisplayLabel(factorId);
  return intent === 'REMOVE' ? `Sans « ${habit} »` : `Avec « ${habit} »`;
}

function formatDayId(dayId: string): string {
  return format(new Date(`${dayId}T12:00:00Z`), 'EEE d MMM', { locale: fr });
}

function deltaLine(experiment: EvaluatedExperiment): string | null {
  if (experiment.verdict === 'abandoned' || experiment.effects.length === 0) {
    return null;
  }
  const gaps = experiment.effects.map(
    (effect) =>
      `${SHORT_OUTCOME_LABELS[effect.outcome]} ${formatSignedDelta(effect.outcome, effect.delta)}`,
  );
  const { nWindow, nBaseline } = experiment.effects[0]!;
  return [...gaps, `${nWindow} j contre ${nBaseline}`].join(' · ');
}

export function toHabitExperimentView(experiment: EvaluatedExperiment): HabitExperimentView {
  const { heldDays } = experiment;
  return {
    id: experiment.id,
    factorId: experiment.factorId,
    title: experimentTitle(experiment.intent, experiment.factorId),
    status: experiment.status,
    progressLabel: `J${experiment.dayIndex} / ${EXPERIMENT_WINDOW_DAYS}`,
    segments: experiment.segments,
    heldLabel: `${heldDays} ${heldDays > 1 ? 'jours tenus' : 'jour tenu'}`,
    reviewLabel: `relecture le ${formatDayId(experiment.reviewDayId)}`,
    verdict: experiment.verdict,
    verdictLabel: experiment.verdict ? EXPERIMENT_VERDICT_LABELS[experiment.verdict] : null,
    deltaLine: deltaLine(experiment),
  };
}

/** Habits with a completed reading carry the « testé » badge in the analysis. */
export function testedFactorIds(experiments: readonly EvaluatedExperiment[]): string[] {
  return [
    ...new Set(
      experiments
        .filter(
          (experiment) => experiment.verdict === 'worked' || experiment.verdict === 'no_effect',
        )
        .map((experiment) => experiment.factorId),
    ),
  ];
}

/** The page shows at most one running test, then the ones already read. */
export function splitExperimentViews(experiments: readonly HabitExperimentView[]): {
  running: HabitExperimentView | null;
  reviewed: HabitExperimentView[];
} {
  return {
    running: experiments.find((experiment) => experiment.status === 'running') ?? null,
    reviewed: experiments.filter((experiment) => experiment.status === 'reviewed'),
  };
}
