/**
 * Habit → coaching signal (presentation only).
 *
 * Turns journal association / running experiment into a Today why fact and an
 * optional rearrange CTA. Never mutates Core or the calendar.
 */

import type { TodayFactRow } from '@/lib/today/dashboard/today-instrument-facts';
import type { TodayJournalHabitCallout } from '@/lib/health/journal-habit-today-bridge';
import {
  buildAdaptDeepLink,
  type FeedbackRearrangeUpcomingSession,
} from '@/lib/today/rich/feedback-rearrange-proposal';
import type { SessionIntensity } from '@prisma/client';
import type { DailyPhase } from '@/lib/daily-phase/types';

const DEMANDING_INTENSITY = new Set<SessionIntensity>(['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);
const COACHING_PHASES = new Set<DailyPhase>([
  'MORNING',
  'BEFORE_SESSION',
  'SESSION_COMPLETED',
  'RECOVERY_WINDOW',
  'END_OF_DAY',
]);

export type HabitRearrangeTrigger = 'HABIT_ASSOCIATION' | 'HABIT_EXPERIMENT';

export type HabitRearrangeProposalView = {
  visible: true;
  headline: string;
  why: string;
  ctaLabel: string;
  href: string;
  focus: string;
  trigger: HabitRearrangeTrigger;
};

export type HabitCoachingSignal = {
  whyFact: TodayFactRow | null;
  /** Association bridge or experiment — for rearrange gating. */
  callout: TodayJournalHabitCallout | null;
};

function isDemanding(intensity: SessionIntensity | null): boolean {
  return intensity !== null && DEMANDING_INTENSITY.has(intensity);
}

function startOfLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

function addLocalDays(day: Date, days: number): Date {
  const next = startOfLocalDay(day);
  next.setDate(next.getDate() + days);
  return next;
}

function pickUpcoming(
  sessions: readonly FeedbackRearrangeUpcomingSession[],
  fromStart: Date,
  horizonDays: number,
): FeedbackRearrangeUpcomingSession[] {
  const fromMs = fromStart.getTime();
  const toMs = addLocalDays(fromStart, horizonDays).getTime();
  return sessions.filter((session) => {
    if (session.completed) {
      return false;
    }
    const time = new Date(session.date).getTime();
    return time >= fromMs && time < toMs;
  });
}

/**
 * One glanceable why fact — habit is a coaching signal, not a restated verdict.
 */
export function habitWhyFactFromCallout(
  callout: TodayJournalHabitCallout | null,
): TodayFactRow | null {
  if (!callout) {
    return null;
  }
  if (callout.kind === 'experiment') {
    const { experiment } = callout;
    return {
      label: 'Test',
      value: experiment.meaning,
      hint: `${experiment.progressLabel} · ${experiment.heldLabel}`,
    };
  }
  const { bridge } = callout;
  return {
    label: 'Journal',
    value: bridge.meaning,
    hint: bridge.confidenceNote,
  };
}

export function buildHabitCoachingSignal(
  callout: TodayJournalHabitCallout | null,
): HabitCoachingSignal {
  return {
    whyFact: habitWhyFactFromCallout(callout),
    callout,
  };
}

function associationRearrangeCopy(
  habitLabel: string,
  meaning: string,
  demandingCount: number,
): Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'> {
  return {
    headline: 'Ton journal oriente le planning',
    why: `${meaning} ${demandingCount} séance${demandingCount > 1 ? 's' : ''} exigeante${demandingCount > 1 ? 's' : ''} restent prévues — le coach peut alléger ou décaler.`,
    focus: `Journal : « ${habitLabel} » associé à une physio plus basse. Réarrange les 14 prochains jours pour protéger le sommeil / la récup (alléger ou décaler les séances exigeantes).`,
  };
}

function experimentRearrangeCopy(
  habitLabel: string,
  title: string,
  demandingCount: number,
): Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'> {
  return {
    headline: 'Ton test d’habitude demande de la marge',
    why: `Tu testes « ${habitLabel} » (${title}). ${demandingCount} séance${demandingCount > 1 ? 's' : ''} exigeante${demandingCount > 1 ? 's' : ''} restent planifiées — laisse de la place pour que le test parle.`,
    focus: `Test d’habitude en cours sur « ${habitLabel} ». Réarrange les 14 prochains jours pour éviter de surcharger pendant le test (alléger ou décaler les séances exigeantes).`,
  };
}

function habitRearrangeWindowStart(phase: DailyPhase, day: Date): Date {
  if (phase === 'MORNING' || phase === 'BEFORE_SESSION') {
    return addLocalDays(startOfLocalDay(day), 1);
  }
  return startOfLocalDay(day);
}

function countDemandingUpcoming(
  sessions: readonly FeedbackRearrangeUpcomingSession[],
  fromStart: Date,
): number {
  return pickUpcoming(sessions, fromStart, 14).filter((s) => isDemanding(s.intensity)).length;
}

function proposalFromCopy(
  trigger: HabitRearrangeTrigger,
  copy: Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'>,
): HabitRearrangeProposalView {
  return {
    visible: true,
    ...copy,
    ctaLabel: 'Proposer un rearrange',
    href: buildAdaptDeepLink(copy.focus),
    trigger,
  };
}

function proposalFromCallout(
  callout: TodayJournalHabitCallout,
  demandingCount: number,
): HabitRearrangeProposalView | null {
  if (callout.kind === 'experiment') {
    const { experiment } = callout;
    return proposalFromCopy(
      'HABIT_EXPERIMENT',
      experimentRearrangeCopy(experiment.habitLabel, experiment.meaning, demandingCount),
    );
  }

  const { bridge } = callout;
  // Only high-confidence drag associations drive a program gesture.
  if (bridge.polarity !== 'minus' || bridge.confidence !== 'high') {
    return null;
  }
  return proposalFromCopy(
    'HABIT_ASSOCIATION',
    associationRearrangeCopy(bridge.habitLabel, bridge.meaning, demandingCount),
  );
}

/**
 * Pure detector: actionable habit signal + demanding upcoming plan → rearrange CTA.
 * Twin mismatch proposals should win when both fire (caller merges).
 */
export function buildHabitRearrangeProposal(input: {
  phase: DailyPhase;
  day: Date;
  upcoming: readonly FeedbackRearrangeUpcomingSession[];
  callout: TodayJournalHabitCallout | null;
}): HabitRearrangeProposalView | null {
  if (!input.callout || !COACHING_PHASES.has(input.phase)) {
    return null;
  }

  const demandingCount = countDemandingUpcoming(
    input.upcoming,
    habitRearrangeWindowStart(input.phase, input.day),
  );
  if (demandingCount === 0) {
    return null;
  }

  return proposalFromCallout(input.callout, demandingCount);
}

/**
 * Twin feedback rearrange wins; habit fills the gap when the plan is still
 * demanding against a journal lever.
 */
export function mergeRearrangeProposals<T extends { trigger: string }>(
  twinProposal: T | null,
  habitProposal: HabitRearrangeProposalView | null,
): T | HabitRearrangeProposalView | null {
  return twinProposal ?? habitProposal;
}
