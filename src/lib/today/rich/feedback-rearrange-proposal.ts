/**
 * Feedback → rearrange proposal (presentation only).
 *
 * When the Twin has absorbed recent feedback and the upcoming plan is in tension
 * with that state, surface a CTA that deep-links into PlanAdapter.
 * Never auto-applies calendar mutations — Core stays frozen.
 */

import type { SessionIntensity } from '@prisma/client';
import type { DailyPhase } from '@/lib/daily-phase/types';
import type { OverallVerdict } from '@/lib/today/dashboard/today-mapping';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';

const HARD_INTENSITY = new Set<SessionIntensity>(['THRESHOLD', 'VO2MAX', 'RACE']);
const DEMANDING_INTENSITY = new Set<SessionIntensity>(['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);
const EASY_INTENSITY = new Set<SessionIntensity>(['RECOVERY', 'ENDURANCE']);
const PROTECT_VERDICTS = new Set<OverallVerdict>(['RECOVER', 'CAUTION', 'TRAIN_EASY']);
const PUSH_VERDICTS = new Set<OverallVerdict>(['TRAIN_HARD', 'RACE_READY']);
const POST_FEEDBACK_PHASES = new Set<DailyPhase>([
  'SESSION_COMPLETED',
  'RECOVERY_WINDOW',
  'END_OF_DAY',
]);
const MORNING_PHASES = new Set<DailyPhase>(['MORNING', 'BEFORE_SESSION']);
const HARD_FEELING = /tr[eè]s\s+dur|épuis|epuis|cassé|casse|overreach|trop\s+dur/i;

export type FeedbackRearrangeUpcomingSession = {
  id: string;
  date: Date | string;
  intensity: SessionIntensity | null;
  completed: boolean;
};

export type FeedbackRearrangeLatestEffort = {
  rpe: number | null;
  feeling: string | null;
};

export type FeedbackRearrangeProposalInput = {
  phase: DailyPhase;
  overallFresh: boolean;
  verdict: OverallVerdict;
  /** Decision confidence 0–1; null when unknown. */
  confidence: number | null;
  day: Date;
  upcoming: FeedbackRearrangeUpcomingSession[];
  latestEffort?: FeedbackRearrangeLatestEffort | null;
};

export type FeedbackRearrangeProposalView = {
  visible: true;
  headline: string;
  why: string;
  ctaLabel: string;
  href: string;
  /** Prefill for PlanAdapter focus textarea. */
  focus: string;
  trigger: 'POST_SESSION' | 'MORNING_MISMATCH';
};

type ProposalCopy = { headline: string; why: string; focus: string };
type ProposalTrigger = FeedbackRearrangeProposalView['trigger'];

export function buildAdaptDeepLink(focus: string): string {
  const params = new URLSearchParams({ adapt: '1', focus });
  return `${TWIN_DRILL_DOWN.planning}?${params.toString()}`;
}

function startOfLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

function addLocalDays(day: Date, days: number): Date {
  const next = startOfLocalDay(day);
  next.setDate(next.getDate() + days);
  return next;
}

function sessionTime(session: FeedbackRearrangeUpcomingSession): number {
  return new Date(session.date).getTime();
}

function isHardSession(intensity: SessionIntensity | null): boolean {
  return intensity !== null && HARD_INTENSITY.has(intensity);
}

function isDemandingSession(intensity: SessionIntensity | null): boolean {
  return intensity !== null && DEMANDING_INTENSITY.has(intensity);
}

function isEasyOrUnknown(intensity: SessionIntensity | null): boolean {
  return intensity === null || EASY_INTENSITY.has(intensity);
}

function confidenceUsable(confidence: number | null): boolean {
  return confidence === null || confidence === undefined || confidence >= 0.6;
}

function pickUpcoming(
  sessions: FeedbackRearrangeUpcomingSession[],
  fromStart: Date,
  horizonDays: number,
): FeedbackRearrangeUpcomingSession[] {
  const fromMs = fromStart.getTime();
  const toMs = addLocalDays(fromStart, horizonDays).getTime();
  return sessions.filter((session) => {
    if (session.completed) {
      return false;
    }
    const time = sessionTime(session);
    return time >= fromMs && time < toMs;
  });
}

function hardEffortLogged(effort: FeedbackRearrangeLatestEffort | null | undefined): boolean {
  if (!effort) {
    return false;
  }
  if (effort.rpe !== null && effort.rpe !== undefined && effort.rpe >= 8) {
    return true;
  }
  return Boolean(effort.feeling && HARD_FEELING.test(effort.feeling));
}

function protectMismatchCopy(upcomingHardCount: number): ProposalCopy {
  return {
    headline: 'Réarranger les séances à venir ?',
    why: `Ton Twin oriente vers la prudence, alors que ${upcomingHardCount} séance${upcomingHardCount > 1 ? 's' : ''} exigeante${upcomingHardCount > 1 ? 's' : ''} restent planifiées.`,
    focus:
      'Twin en mode prudence / récupération. Allège ou décale les séances exigeantes des 14 prochains jours pour absorber le feedback récent.',
  };
}

function pushMismatchCopy(): ProposalCopy {
  return {
    headline: 'Le plan est trop sage pour ton Twin',
    why: 'Tu as de la marge pour progresser, mais les séances à venir restent surtout faciles.',
    focus:
      'Twin en capacité de pousser. Propose un rearrange des 14 prochains jours pour mieux utiliser cette fenêtre (sans surcharge inutile).',
  };
}

function hardEffortCopy(): ProposalCopy {
  return {
    headline: 'Séance dure intégrée — ajuster la suite ?',
    why: 'L’effort d’aujourd’hui est exigeant. Le Twin est à jour : vérifie que les prochaines séances laissent de la place pour absorber.',
    focus:
      'Effort récent dur (ressenti / RPE). Réarrange les 14 prochains jours pour laisser absorber avant de remonter l’intensité.',
  };
}

function buildProposal(
  trigger: ProposalTrigger,
  copy: ProposalCopy,
): FeedbackRearrangeProposalView {
  return {
    visible: true,
    headline: copy.headline,
    why: copy.why,
    ctaLabel: 'Proposer un rearrange',
    href: buildAdaptDeepLink(copy.focus),
    focus: copy.focus,
    trigger,
  };
}

function resolvePhaseTrigger(phase: DailyPhase): ProposalTrigger | null {
  if (POST_FEEDBACK_PHASES.has(phase)) {
    return 'POST_SESSION';
  }
  if (MORNING_PHASES.has(phase)) {
    return 'MORNING_MISMATCH';
  }
  return null;
}

function upcomingWindowStart(day: Date, trigger: ProposalTrigger): Date {
  const dayStart = startOfLocalDay(day);
  // Morning: tomorrow+ (today owned by morning recalibration). Post: remaining today+.
  return trigger === 'MORNING_MISMATCH' ? addLocalDays(dayStart, 1) : dayStart;
}

function matchRearrangeProposal(
  input: FeedbackRearrangeProposalInput,
  trigger: ProposalTrigger,
  upcoming: FeedbackRearrangeUpcomingSession[],
): FeedbackRearrangeProposalView | null {
  const demandingCount = upcoming.filter((s) => isDemandingSession(s.intensity)).length;
  if (PROTECT_VERDICTS.has(input.verdict) && demandingCount > 0) {
    return buildProposal(trigger, protectMismatchCopy(demandingCount));
  }

  const onlyEasy = upcoming.every((s) => isEasyOrUnknown(s.intensity));
  if (PUSH_VERDICTS.has(input.verdict) && onlyEasy) {
    return buildProposal(trigger, pushMismatchCopy());
  }

  const hardCount = upcoming.filter((s) => isHardSession(s.intensity)).length;
  const postHardEffort =
    trigger === 'POST_SESSION' && hardEffortLogged(input.latestEffort) && hardCount > 0;
  if (postHardEffort) {
    return buildProposal('POST_SESSION', hardEffortCopy());
  }

  return null;
}

function canEvaluateProposal(input: FeedbackRearrangeProposalInput): boolean {
  return (
    input.overallFresh &&
    confidenceUsable(input.confidence) &&
    input.verdict !== 'INSUFFICIENT_DATA'
  );
}

/**
 * Pure detector: actionable Twin + upcoming plan tension → rearrange CTA.
 */
export function buildFeedbackRearrangeProposal(
  input: FeedbackRearrangeProposalInput,
): FeedbackRearrangeProposalView | null {
  if (!canEvaluateProposal(input)) {
    return null;
  }

  const trigger = resolvePhaseTrigger(input.phase);
  if (!trigger) {
    return null;
  }

  const upcoming = pickUpcoming(input.upcoming, upcomingWindowStart(input.day, trigger), 14);
  if (upcoming.length === 0) {
    return null;
  }

  return matchRearrangeProposal(input, trigger, upcoming);
}
