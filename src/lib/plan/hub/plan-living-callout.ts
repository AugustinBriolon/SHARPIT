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
import { buildHabitRearrangeProposal } from '@/lib/today/rich/habit-coaching-signal';
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
    accent: 'ajuster',
  };
}

function pushCallout(
  goalLabel: string | null,
  upcoming: PlanLivingSessionInput[],
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
    accent: 'ajuster',
  };
}

function twinLivingCallout(input: {
  verdict: OverallVerdict;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
}): PlanLivingCalloutView | null {
  const hard = demandingCount(input.upcoming);
  if (PROTECT_VERDICTS.has(input.verdict) && hard > 0) {
    return protectCallout(hard, input.goalLabel, input.upcoming);
  }
  if (PUSH_VERDICTS.has(input.verdict) && onlyEasyUpcoming(input.upcoming)) {
    return pushCallout(input.goalLabel, input.upcoming);
  }
  return null;
}

function habitLivingCallout(input: {
  habitCallout: TodayJournalHabitCallout;
  goalLabel: string | null;
  upcoming: PlanLivingSessionInput[];
  day: Date;
}): PlanLivingCalloutView | null {
  // Hub looks at remaining week from today — include today in the habit window.
  const habitProposal = buildHabitRearrangeProposal({
    phase: 'END_OF_DAY',
    day: input.day,
    upcoming: input.upcoming,
    callout: input.habitCallout,
    goalLabel: input.goalLabel,
  });
  if (!habitProposal) {
    return null;
  }
  return habitCalloutFromProposal(habitProposal, input.goalLabel);
}

/**
 * Show the Plan vivant callout when the hub accent is already `ajuster`
 * (sessions exist toward a dated goal) AND Twin tension warrants a rearrange
 * prompt — protect + demanding remaining, or push with only easy remaining.
 * When Twin is silent, a gated journal habit lever can fill the same slot.
 */
export function buildPlanLivingCallout(input: {
  hasDatedGoal: boolean;
  hasActiveMacro: boolean;
  hasRemainingSessions: boolean;
  goalLabel: string | null;
  verdict: OverallVerdict | null;
  remaining: readonly PlanLivingSessionInput[];
  /** Optional journal callout — habit fallback when Twin is quiet. */
  habitCallout?: TodayJournalHabitCallout | null;
  /** Local day for habit window (defaults to now). */
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
  if (input.verdict) {
    const twin = twinLivingCallout({
      verdict: input.verdict,
      goalLabel: input.goalLabel,
      upcoming,
    });
    if (twin) {
      return twin;
    }
  }

  if (!input.habitCallout) {
    return null;
  }

  return habitLivingCallout({
    habitCallout: input.habitCallout,
    goalLabel: input.goalLabel,
    upcoming,
    day: input.day ?? new Date(),
  });
}
