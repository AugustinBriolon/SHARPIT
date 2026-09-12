/**
 * Habit → coaching signal (presentation only).
 *
 * Turns journal association / running experiment into an optional rearrange
 * CTA on Today / Plan hub. Never mutates Core or the calendar.
 */

import type { TodayJournalHabitCallout } from '@/lib/journal/journal-habit-today-bridge';
import {
  buildAdaptDeepLink,
  type FeedbackRearrangeUpcomingSession,
} from '@/lib/today/rich/feedback-rearrange-proposal';
import {
  buildRearrangePreviewSessions,
  type RearrangePreviewSession,
} from '@/lib/today/rich/rearrange-preview';
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

/** Journal lever shown on Plan vivant (chip / eyebrow) — not a second CTA. */
export type HabitLeverAnnotation = {
  label: string;
  source: 'association' | 'experiment';
};

export type HabitRearrangeProposalView = {
  visible: true;
  headline: string;
  why: string;
  ctaLabel: string;
  href: string;
  focus: string;
  trigger: HabitRearrangeTrigger;
  kind: 'habit';
  previewSessions: RearrangePreviewSession[];
  habitLever: HabitLeverAnnotation;
};

export type HabitCoachingSignal = {
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

export function buildHabitCoachingSignal(
  callout: TodayJournalHabitCallout | null,
): HabitCoachingSignal {
  return { callout };
}

function goalPhrase(goalLabel: string | null | undefined): string {
  const trimmed = goalLabel?.trim();
  return trimmed ? `vers ${trimmed}` : 'vers ton objectif';
}

function associationRearrangeCopy(
  habitLabel: string,
  meaning: string,
  demandingCount: number,
  goalLabel: string | null | undefined,
): Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'> {
  const toward = goalPhrase(goalLabel);
  return {
    headline: 'Ton journal oriente le planning',
    why: `${meaning} ${demandingCount} séance${demandingCount > 1 ? 's' : ''} exigeante${demandingCount > 1 ? 's' : ''} restent prévues ${toward} — le coach peut alléger ou décaler.`,
    focus: `Journal : « ${habitLabel} » associé à une physio plus basse. Réarrange les 14 prochains jours ${toward} pour protéger le sommeil / la récup (alléger ou décaler les séances exigeantes).`,
  };
}

function experimentRearrangeCopy(
  habitLabel: string,
  progressLabel: string,
  demandingCount: number,
  goalLabel: string | null | undefined,
): Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'> {
  const toward = goalPhrase(goalLabel);
  return {
    headline: 'Ton test d’habitude demande de la marge',
    why: `Tu testes « ${habitLabel} » (${progressLabel}). ${demandingCount} séance${demandingCount > 1 ? 's' : ''} exigeante${demandingCount > 1 ? 's' : ''} restent planifiées ${toward} — laisse de la place pour que le test parle.`,
    focus: `Test d’habitude en cours sur « ${habitLabel} ». Réarrange les 14 prochains jours ${toward} pour éviter de surcharger pendant le test (alléger ou décaler les séances exigeantes).`,
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

function proposalFromCopy(input: {
  trigger: HabitRearrangeTrigger;
  copy: Pick<HabitRearrangeProposalView, 'headline' | 'why' | 'focus'>;
  habitLever: HabitLeverAnnotation;
  upcoming: readonly FeedbackRearrangeUpcomingSession[];
  fromStart: Date;
}): HabitRearrangeProposalView {
  const windowSessions = pickUpcoming(input.upcoming, input.fromStart, 14);
  return {
    visible: true,
    ...input.copy,
    ctaLabel: 'Proposer un rearrange',
    href: buildAdaptDeepLink(input.copy.focus),
    trigger: input.trigger,
    kind: 'habit',
    previewSessions: buildRearrangePreviewSessions(windowSessions, 'habit'),
    habitLever: input.habitLever,
  };
}

function proposalFromCallout(input: {
  callout: TodayJournalHabitCallout;
  demandingCount: number;
  upcoming: readonly FeedbackRearrangeUpcomingSession[];
  fromStart: Date;
  goalLabel: string | null | undefined;
}): HabitRearrangeProposalView | null {
  if (input.callout.kind === 'experiment') {
    const { experiment } = input.callout;
    return proposalFromCopy({
      trigger: 'HABIT_EXPERIMENT',
      copy: experimentRearrangeCopy(
        experiment.habitLabel,
        experiment.progressLabel,
        input.demandingCount,
        input.goalLabel,
      ),
      habitLever: { label: experiment.habitLabel, source: 'experiment' },
      upcoming: input.upcoming,
      fromStart: input.fromStart,
    });
  }

  const { bridge } = input.callout;
  // Only high-confidence drag associations drive a program gesture.
  if (bridge.polarity !== 'minus' || bridge.confidence !== 'high') {
    return null;
  }
  return proposalFromCopy({
    trigger: 'HABIT_ASSOCIATION',
    copy: associationRearrangeCopy(
      bridge.habitLabel,
      bridge.meaning,
      input.demandingCount,
      input.goalLabel,
    ),
    habitLever: { label: bridge.habitLabel, source: 'association' },
    upcoming: input.upcoming,
    fromStart: input.fromStart,
  });
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
  goalLabel?: string | null;
}): HabitRearrangeProposalView | null {
  if (!input.callout || !COACHING_PHASES.has(input.phase)) {
    return null;
  }

  const fromStart = habitRearrangeWindowStart(input.phase, input.day);
  const demandingCount = countDemandingUpcoming(input.upcoming, fromStart);
  if (demandingCount === 0) {
    return null;
  }

  return proposalFromCallout({
    callout: input.callout,
    demandingCount,
    upcoming: input.upcoming,
    fromStart,
    goalLabel: input.goalLabel,
  });
}

/**
 * Twin feedback rearrange wins; habit fills the gap when the plan is still
 * demanding against a journal lever. When Twin wins and habit also fires,
 * annotate the same CTA with `habitLever` (no second card).
 */
export function mergeRearrangeProposals<T extends { trigger: string }>(
  twinProposal: T | null,
  habitProposal: HabitRearrangeProposalView | null,
): (T & { habitLever: HabitLeverAnnotation | null }) | HabitRearrangeProposalView | null {
  if (twinProposal) {
    return {
      ...twinProposal,
      habitLever: habitProposal?.habitLever ?? null,
    };
  }
  return habitProposal;
}

/** True when PlanAdapter focus was prefilled from a journal habit rearrange. */
export function isHabitPlanFocus(focus: string | null | undefined): boolean {
  if (!focus) {
    return false;
  }
  return /^Journal\s*:/i.test(focus.trim()) || /^Test d[’']habitude/i.test(focus.trim());
}

export function habitLeverChipLabel(lever: HabitLeverAnnotation): string {
  return lever.source === 'experiment' ? `Test · ${lever.label}` : `Journal · ${lever.label}`;
}

/** Rail caption when journal habit drives the rearrange preview (UI FR). */
export const HABIT_SESSION_TENSION_CAPTION = 'Tension journal → séances';
