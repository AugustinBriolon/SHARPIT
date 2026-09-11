/**
 * Today bridge for journal habit reading — one priority insight only.
 * Presentation layer; never mutates Core / snapshot.
 */

import type {
  CompiledJournalHabitFinding,
  JournalHabitFinding,
  JournalOutcomeKey,
} from '@/lib/journal/journal-habit-analysis';
import {
  buildJournalHabitReading,
  type JournalHabitReading,
} from '@/lib/journal/journal-habit-reading';
import {
  confidenceLabel,
  journalFactorDisplayLabel,
} from '@/lib/journal/journal-habit-finding-copy';
import type { HabitExperimentView } from '@/lib/journal/journal-habit-experiment-view';
import type { ExperimentDaySegment } from '@/lib/journal/journal-habit-experiment';
import { isJournalAnalysisReady } from '@/lib/journal/journal-limits';

export const JOURNAL_ANALYSES_HREF = '/journal/analyses';

const OUTCOME_LABELS: Record<JournalOutcomeKey, string> = {
  sleepMinutes: 'sommeil',
  recoveryScore: 'récupération',
  bodyBattery: 'Body Battery',
};

const OUTCOME_ORDER: JournalOutcomeKey[] = ['sleepMinutes', 'recoveryScore', 'bodyBattery'];

export type TodayJournalHabitBridge = {
  /** Provenance — always Journal. */
  sourceLabel: string;
  /** Habit name alone — e.g. « Écran au lit ». */
  habitLabel: string;
  /** Full sentence a first-week athlete can parse. */
  meaning: string;
  /** Soft claim — association, not causation. */
  disclaimer: string;
  /** Confidence in plain French. */
  confidenceNote: string;
  /** CTA on Today. */
  ctaLabel: string;
  polarity: 'plus' | 'minus';
  confidence: 'high' | 'medium';
  factorId: string;
  href: typeof JOURNAL_ANALYSES_HREF;
};

/** Running 7-day test callout on Today — glanceable: habit + day track + Jx/7. */
export type TodayJournalHabitExperimentBridge = {
  sourceLabel: string;
  meaning: string;
  habitLabel: string;
  progressLabel: string;
  heldLabel: string;
  segments: ExperimentDaySegment[];
  segmentsLabel: string;
  ctaLabel: string;
  factorId: string;
  href: typeof JOURNAL_ANALYSES_HREF;
};

export type TodayJournalHabitCallout =
  | { kind: 'experiment'; experiment: TodayJournalHabitExperimentBridge }
  | { kind: 'association'; bridge: TodayJournalHabitBridge };

function joinOutcomeLabels(outcomes: readonly JournalOutcomeKey[]): string {
  const labels = outcomes.map((outcome) => OUTCOME_LABELS[outcome]);
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} et ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

/**
 * Athlete-facing Today copy.
 * Answers: where from? what habit? what pattern? how sure? what next?
 */
export function formatTodayJournalHabitBridgeCopy(
  priority: CompiledJournalHabitFinding,
): Pick<
  TodayJournalHabitBridge,
  'sourceLabel' | 'habitLabel' | 'meaning' | 'disclaimer' | 'confidenceNote' | 'ctaLabel'
> {
  const habitLabel = journalFactorDisplayLabel(priority.factorId);
  const outcomes = [...priority.effects]
    .map((effect) => effect.outcome)
    .sort((a, b) => OUTCOME_ORDER.indexOf(a) - OUTCOME_ORDER.indexOf(b));
  const outcomePhrase = joinOutcomeLabels(outcomes);
  const direction = priority.polarity === 'minus' ? 'plus bas' : 'plus haut';
  const copula = outcomes.length === 1 ? 'est' : 'sont';

  return {
    sourceLabel: 'Depuis ton journal',
    habitLabel,
    meaning: `Quand tu notes « ${habitLabel} », ${outcomePhrase} ${copula} souvent ${direction}.`,
    disclaimer: 'Contraste dans tes saisies — pas une preuve de cause.',
    confidenceNote: confidenceLabel(priority.confidence),
    ctaLabel: 'Voir l’analyse',
  };
}

/**
 * Map a habit reading to a single Today callout, or null when silent.
 * Gate: analysis ready + non-null priority.
 */
export function todayJournalHabitBridgeFromReading(
  reading: JournalHabitReading,
): TodayJournalHabitBridge | null {
  if (!isJournalAnalysisReady(reading.daysWithSignal)) {
    return null;
  }
  const { priority } = reading;
  if (!priority) {
    return null;
  }
  const copy = formatTodayJournalHabitBridgeCopy(priority);
  return {
    ...copy,
    polarity: priority.polarity,
    confidence: priority.confidence,
    factorId: priority.factorId,
    href: JOURNAL_ANALYSES_HREF,
  };
}

/** Server/API seam: findings + days → optional Today bridge. */
export function buildTodayJournalHabitBridge(
  findings: readonly JournalHabitFinding[],
  daysWithSignal: number,
): TodayJournalHabitBridge | null {
  return todayJournalHabitBridgeFromReading(buildJournalHabitReading(findings, daysWithSignal));
}

/**
 * Athlete-facing Today payload while a 7-day habit test is running.
 * Glanceable fields first; long review copy stays off the plate (aria only).
 */
export function formatTodayHabitExperimentBridge(
  experiment: HabitExperimentView,
): TodayJournalHabitExperimentBridge {
  return {
    sourceLabel: 'Test',
    meaning: experiment.title,
    habitLabel: journalFactorDisplayLabel(experiment.factorId),
    progressLabel: experiment.progressLabel,
    heldLabel: experiment.heldLabel,
    segments: [...experiment.segments],
    segmentsLabel: `${experiment.heldLabel} sur 7, ${experiment.progressLabel}, ${experiment.reviewLabel}`,
    ctaLabel: 'Voir le test',
    factorId: experiment.factorId,
    href: JOURNAL_ANALYSES_HREF,
  };
}

/**
 * A running test outranks the association insight — the athlete already chose
 * a lever; Today should track that commitment, not re-pitch the pattern.
 */
export function resolveTodayJournalHabitCallout(
  running: HabitExperimentView | null,
  bridge: TodayJournalHabitBridge | null,
): TodayJournalHabitCallout | null {
  if (running) {
    return { kind: 'experiment', experiment: formatTodayHabitExperimentBridge(running) };
  }
  if (bridge) {
    return { kind: 'association', bridge };
  }
  return null;
}
