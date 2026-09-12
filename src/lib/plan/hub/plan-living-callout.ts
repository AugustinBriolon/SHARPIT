/**
 * Plan hub — when to elevate the living-plan / adjust gesture.
 * Pure, testable. Does not open a 4th coach door — accent stays #92.
 */

import type { SessionIntensity } from '@prisma/client';
import type { TodayJournalHabitCallout } from '@/lib/journal/journal-habit-today-bridge';
import {
  buildRearrangePreviewSessions,
  type RearrangePreviewSession,
} from '@/lib/today/rich/rearrange-preview';
import {
  buildHabitRearrangeProposal,
  type HabitLeverAnnotation,
} from '@/lib/today/rich/habit-coaching-signal';
import { resolvePlanCoachAccent, type PlanCoachAccent } from '@/lib/plan/hub/plan-coach-offer';
import type { OverallVerdict } from '@/lib/today/dashboard/today-mapping';

const PROTECT_VERDICTS = new Set<OverallVerdict>(['RECOVER', 'CAUTION', 'TRAIN_EASY']);
const DEMANDING = new Set<SessionIntensity>(['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);
const PUSH_VERDICTS = new Set<OverallVerdict>(['TRAIN_HARD', 'RACE_READY']);

export type PlanLivingSessionInput = {
  id: string;
  date: Date | string;
  intensity: SessionIntensity | null;
  completed: boolean;
};

export type PlanLivingCalloutView = {
  visible: true;
  headline: string;
  why: string;
  ctaLabel: string;
  goalLabel: string | null;
  kind: 'protect' | 'push' | 'habit';
  previewSessions: RearrangePreviewSession[];
  /** Prefill for PlanAdapter when opened in place. */
  focus: string;
  /** Journal lever when habit drives or annotates the same CTA (Today-aligned). */
  habitLever: HabitLeverAnnotation | null;
  /** Accent that justified elevating adjust — for telemetry / tests. */
  accent: Extract<PlanCoachAccent, 'ajuster'>;
};

const PROTECT_FOCUS =
  'Twin en mode prudence. Allège ou décale les séances exigeantes pour absorber le feedback récent.';
const PUSH_FOCUS =
  'Twin en capacité de pousser. Réarrange la semaine pour mieux utiliser cette fenêtre vers l’objectif.';

function demandingCount(sessions: readonly PlanLivingSessionInput[]): number {
  return sessions.filter((s) => !s.completed && s.intensity && DEMANDING.has(s.intensity)).length;
}

function onlyEasyUpcoming(sessions: readonly PlanLivingSessionInput[]): boolean {
  return sessions.every((s) => !s.intensity || !DEMANDING.has(s.intensity));
}

function protectCallout(
  hard: number,
  goalLabel: string | null,
  upcoming: PlanLivingSessionInput[],
  habitLever: HabitLeverAnnotation | null = null,
): PlanLivingCalloutView {
  return {
    visible: true,
    headline: 'Plan vivant — tension avec ton Twin',
    why: `Vers ton objectif, ${hard} séance${hard > 1 ? 's' : ''} exigeante${hard > 1 ? 's' : ''} restent prévues alors que le Twin oriente vers la prudence.`,
    ctaLabel: 'Ajuster le planning',
    goalLabel,
    kind: 'protect',
    previewSessions: buildRearrangePreviewSessions(upcoming, 'protect'),
    focus: PROTECT_FOCUS,
    habitLever,
    accent: 'ajuster',
  };
}

function pushCallout(
  goalLabel: string | null,
  upcoming: PlanLivingSessionInput[],
  habitLever: HabitLeverAnnotation | null = null,
): PlanLivingCalloutView {
  return {
    visible: true,
    headline: 'Plan vivant — marge sous-utilisée',
    why: 'Ton Twin a de la capacité, mais la semaine reste surtout facile face à ton objectif.',
    ctaLabel: 'Ajuster le planning',
    goalLabel,
    kind: 'push',
    previewSessions: buildRearrangePreviewSessions(upcoming, 'push'),
    focus: PUSH_FOCUS,
    habitLever,
    accent: 'ajuster',
  };
}

function habitCalloutFromProposal(
  proposal: NonNullable<ReturnType<typeof buildHabitRearrangeProposal>>,
  goalLabel: string | null,
): PlanLivingCalloutView {
  return {
    visible: true,
    headline: proposal.headline,
    why: proposal.why,
    ctaLabel: 'Ajuster le planning',
    goalLabel,
    kind: 'habit',
    previewSessions: proposal.previewSessions,
    focus: proposal.focus,
    habitLever: proposal.habitLever,
    accent: 'ajuster',
  };
}

function twinLivingCallout(input: {
  verdict: OverallVerdict;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
  habitLever?: HabitLeverAnnotation | null;
}): PlanLivingCalloutView | null {
  const hard = demandingCount(input.upcoming);
  const lever = input.habitLever ?? null;
  if (PROTECT_VERDICTS.has(input.verdict) && hard > 0) {
    return protectCallout(hard, input.goalLabel, input.upcoming, lever);
  }
  if (PUSH_VERDICTS.has(input.verdict) && onlyEasyUpcoming(input.upcoming)) {
    return pushCallout(input.goalLabel, input.upcoming, lever);
  }
  return null;
}

function habitProposalForHub(input: {
  habitCallout: TodayJournalHabitCallout;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
  day: Date;
}): NonNullable<ReturnType<typeof buildHabitRearrangeProposal>> | null {
  // Hub looks at remaining week from today — include today in the habit window.
  return buildHabitRearrangeProposal({
    phase: 'END_OF_DAY',
    day: input.day,
    upcoming: input.upcoming,
    callout: input.habitCallout,
    goalLabel: input.goalLabel,
  });
}

type HabitProposal = NonNullable<ReturnType<typeof buildHabitRearrangeProposal>>;

/** Habit path needs an explicit clock — never invent `new Date()` (prerender-safe). */
function resolveHubHabitProposal(input: {
  habitCallout?: TodayJournalHabitCallout | null;
  day?: Date;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
}): HabitProposal | null {
  if (!input.habitCallout || !input.day) {
    return null;
  }
  return habitProposalForHub({
    habitCallout: input.habitCallout,
    goalLabel: input.goalLabel,
    upcoming: input.upcoming,
    day: input.day,
  });
}

function twinThenHabitCallout(input: {
  verdict: OverallVerdict | null;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
  habitProposal: HabitProposal | null;
}): PlanLivingCalloutView | null {
  const habitLever = input.habitProposal?.habitLever ?? null;
  if (input.verdict) {
    const twin = twinLivingCallout({
      verdict: input.verdict,
      goalLabel: input.goalLabel,
      upcoming: input.upcoming,
      habitLever,
    });
    if (twin) {
      return twin;
    }
  }
  if (!input.habitProposal) {
    return null;
  }
  return habitCalloutFromProposal(input.habitProposal, input.goalLabel);
}

/**
 * Show the Plan vivant callout when the hub accent is already `ajuster`
 * (sessions exist toward a dated goal) AND Twin tension warrants a rearrange
 * prompt — protect + demanding remaining, or push with only easy remaining.
 * When Twin is silent, a gated journal habit lever can fill the same slot.
 * Twin + habit → same Twin CTA annotated with `habitLever` (Today-aligned).
 *
 * `day` is required for any habit path — never default to `new Date()`
 * (presentation pures must stay prerender-safe; callers pass `model.now`).
 */
export function buildPlanLivingCallout(input: {
  hasDatedGoal: boolean;
  hasActiveMacro: boolean;
  hasRemainingSessions: boolean;
  goalLabel: string | null;
  verdict: OverallVerdict | null;
  remaining: readonly PlanLivingSessionInput[];
  /** Optional journal callout — habit annotate / fallback when gated. */
  habitCallout?: TodayJournalHabitCallout | null;
  /** Local day for habit window — required when habitCallout is used. */
  day?: Date;
}): PlanLivingCalloutView | null {
  const accent = resolvePlanCoachAccent({
    hasDatedGoal: input.hasDatedGoal,
    hasActiveMacro: input.hasActiveMacro,
    hasRemainingSessions: input.hasRemainingSessions,
  });
  if (accent !== 'ajuster' || input.remaining.length === 0) {
    return null;
  }

  const upcoming = [...input.remaining];
  const habitProposal = resolveHubHabitProposal({
    habitCallout: input.habitCallout,
    day: input.day,
    goalLabel: input.goalLabel,
    upcoming,
  });
  return twinThenHabitCallout({
    verdict: input.verdict,
    goalLabel: input.goalLabel,
    upcoming,
    habitProposal,
  });
}
