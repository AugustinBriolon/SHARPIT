import type { TodayGoalContext } from '@/lib/daily-phase/goal-context';
import {
  buildEndOfDayNarrativeCopy,
  isRecoveryStress,
  type EveningSleepHints,
  type TomorrowSessionHint,
} from '@/lib/daily-phase/evening-context';
import type { OverallVerdict } from '@/lib/today-mapping';
import type { TodayEffortLevel } from '@/lib/today-narrative-context';
import type { DailyPhase, DailyPhaseResolution, DailyPhaseWhyFocus } from '@/lib/daily-phase/types';
import { isForwardAdvicePhase, isPostTrainingPhase } from '@/lib/daily-phase/resolve';

export type TodayPosture = 'protect' | 'steady' | 'push' | 'uncertain';

export type PhaseNarrativeInput = {
  resolution: DailyPhaseResolution;
  verdict: OverallVerdict;
  adviceActionable: boolean;
  actionLine: string | null;
  sportLabel: string | null;
  totalTssToday: number | null;
  dailyStrainScore: number | null;
  dailyStrainAvailable: boolean;
  limitingFactorMessage?: string | null;
  goalContext?: TodayGoalContext | null;
  evening?: {
    effortLevel: TodayEffortLevel | null;
    totalDurationMin: number | null;
    completedSessionCount: number;
    tomorrowSession: TomorrowSessionHint | null;
    sleep: EveningSleepHints;
  };
};

export type PhaseNarrative = {
  heroEyebrow: string;
  heroHeadline: string;
  heroSubline: string;
  whyFocus: DailyPhaseWhyFocus;
  posture: TodayPosture;
  postureLabel: string;
  focusPriority: string | null;
  goalLine: string | null;
  adaptationReminders: string[];
};

const PHASE_HERO_EYEBROW: Partial<Record<DailyPhase, string>> = {
  END_OF_DAY: 'Ce soir',
  RECOVERY_WINDOW: 'Après la séance',
};

function postureLabelForPhase(posture: TodayPosture, phase: DailyPhase): string | null {
  if (phase === 'END_OF_DAY' || phase === 'SESSION_COMPLETED') return null;

  switch (posture) {
    case 'protect':
      return phase === 'MORNING' ? 'Récup d’abord' : 'Récup fragile';
    case 'steady':
      return 'Forme stable';
    case 'push':
      return 'Feu vert';
    default:
      return 'À préciser';
  }
}

const ADAPTATION_REMINDERS: Record<
  Extract<DailyPhase, 'RECOVERY_WINDOW' | 'END_OF_DAY'>,
  string[]
> = {
  RECOVERY_WINDOW: [
    'Hydrate dans l’heure qui suit.',
    'Repas riches en protéines et glucides dans les 2 h.',
    'Étirements ou marche légère si tu restes actif.',
    'Sommeil : c’est là que l’adaptation se consolide.',
  ],
  END_OF_DAY: [
    'Vise ta fenêtre de sommeil ce soir.',
    'La fatigue de demain se joue souvent ce soir.',
  ],
};

function phaseOf(input: PhaseNarrativeInput): DailyPhase {
  return input.resolution.phase;
}

function resolvePosture(input: PhaseNarrativeInput): TodayPosture {
  const phase = phaseOf(input);
  const { verdict, goalContext, limitingFactorMessage } = input;

  if (
    phase === 'END_OF_DAY' &&
    limitingFactorMessage &&
    /récupération|déficit|fatigue|sommeil/i.test(limitingFactorMessage)
  ) {
    return 'protect';
  }

  if (goalContext?.linkedToTodaySession && isForwardAdvicePhase(phase)) {
    if (verdict === 'RECOVER' || verdict === 'CAUTION') return 'protect';
    return 'push';
  }

  switch (verdict) {
    case 'RECOVER':
    case 'CAUTION':
      return 'protect';
    case 'RACE_READY':
      return 'push';
    case 'TRAIN_HARD':
      return phase === 'END_OF_DAY' || phase === 'RECOVERY_WINDOW' ? 'steady' : 'push';
    case 'TRAIN_EASY':
    case 'TRAIN_SMART':
      return 'steady';
    default:
      return 'uncertain';
  }
}

function goalSuffix(goalContext: TodayGoalContext): string {
  return goalContext.badge ? ` · ${goalContext.badge}` : '';
}

function goalLineForPhase(input: PhaseNarrativeInput): string | null {
  const phase = phaseOf(input);
  const { goalContext } = input;
  if (!goalContext) return null;

  const badge = goalContext.badge ? ` (${goalContext.badge})` : '';

  if (goalContext.linkedToTodaySession && isForwardAdvicePhase(phase)) {
    return `Objectif : ${goalContext.title}${badge}`;
  }

  if (phase === 'SESSION_COMPLETED' && goalContext.linkedToTodaySession) {
    return `Séance utile pour ${goalContext.title}${badge}`;
  }

  if ((phase === 'END_OF_DAY' || phase === 'RECOVERY_WINDOW') && goalContext.isPrimaryRace) {
    return `${goalContext.title}${goalSuffix(goalContext)}`;
  }

  if (goalContext.isPrimaryRace && goalContext.daysUntil != null && goalContext.daysUntil <= 21) {
    return `${goalContext.title}${goalSuffix(goalContext)}`;
  }

  return null;
}

function adaptationRemindersForPhase(phase: DailyPhase): string[] {
  if (phase === 'RECOVERY_WINDOW' || phase === 'END_OF_DAY') {
    return ADAPTATION_REMINDERS[phase];
  }
  return [];
}

function focusPriorityForPhase(
  input: PhaseNarrativeInput,
  adaptationReminders: string[],
): string | null {
  const phase = phaseOf(input);
  const { actionLine, goalContext, verdict } = input;

  if (isForwardAdvicePhase(phase) && actionLine) {
    if (goalContext?.linkedToTodaySession && verdict === 'RECOVER') {
      return 'Allège la séance pour rester frais pour ton objectif';
    }
    if (goalContext?.linkedToTodaySession && verdict === 'CAUTION') {
      return 'Reste sous contrôle — la qualité compte plus que le volume';
    }
    return actionLine;
  }

  if (phase === 'SESSION_COMPLETED') {
    if (goalContext?.linkedToTodaySession) {
      return 'Récupère dans les 2 h — c’est ce qui consolide la séance';
    }
    return 'Récupère dans les 2 h avant le prochain signal';
  }

  if (phase === 'RECOVERY_WINDOW' || phase === 'END_OF_DAY') {
    if (phase === 'END_OF_DAY') return null;
    return adaptationReminders[0] ?? null;
  }

  return null;
}

function inferEffortFromTss(totalTssToday: number | null): TodayEffortLevel | null {
  if (totalTssToday == null) return null;
  if (totalTssToday >= 65) return 'high';
  if (totalTssToday >= 30) return 'moderate';
  return 'light';
}

function resolveEffortLevel(input: PhaseNarrativeInput): TodayEffortLevel | null {
  return input.evening?.effortLevel ?? inferEffortFromTss(input.totalTssToday);
}

function sportAfterPhrase(sport: string): string {
  switch (sport) {
    case 'Course':
      return 'ta course';
    case 'Vélo':
      return 'le vélo';
    case 'Natation':
      return 'ta natation';
    case 'Musculation':
      return 'ta musculation';
    case 'Triathlon':
      return 'le triathlon';
    default:
      return 'la séance';
  }
}

function sportEffortWord(sport: string, level: TodayEffortLevel | null): string {
  const isMasculine = sport === 'Vélo' || sport === 'Triathlon';
  switch (level) {
    case 'high':
      return isMasculine ? 'exigeant' : 'exigeante';
    case 'moderate':
      return isMasculine ? 'modéré' : 'modérée';
    default:
      return isMasculine ? 'léger' : 'légère';
  }
}

function postTrainingHeadline(
  phase: 'SESSION_COMPLETED' | 'RECOVERY_WINDOW',
  input: PhaseNarrativeInput,
  posture: TodayPosture,
): string {
  const sport = input.sportLabel ?? 'Séance';
  const effortLevel = resolveEffortLevel(input);
  const recoveryStress = isRecoveryStress(input.limitingFactorMessage);
  const multi = (input.evening?.completedSessionCount ?? 1) >= 2;
  const goal = input.goalContext;

  if (phase === 'SESSION_COMPLETED') {
    if (goal?.linkedToTodaySession) {
      return `${sport} faite — utile pour ton objectif`;
    }
    if (multi) {
      return 'Double séance — récupération prioritaire maintenant';
    }
    if (recoveryStress || posture === 'protect') {
      return `${sport} faite — récupération prioritaire maintenant`;
    }
    if (effortLevel === 'high') {
      return `${sport} ${sportEffortWord(sport, effortLevel)} — laisse le corps digérer`;
    }
    if (effortLevel === 'moderate') {
      return `${sport} faite — place à la récupération`;
    }
    return `${sport} faite — séance dans les jambes`;
  }

  if (multi) {
    return posture === 'protect'
      ? 'Après le double bloc — récupération à consolider'
      : 'Après le double bloc — fenêtre d’adaptation ouverte';
  }

  const after = sportAfterPhrase(sport);

  if (recoveryStress || posture === 'protect') {
    return `Après ${after} — récupération à consolider`;
  }

  if (effortLevel === 'high') {
    return `Après ${after} — nutrition et sommeil d'abord`;
  }

  return `Après ${after} — fenêtre d’adaptation ouverte`;
}

function headlineForPhase(input: PhaseNarrativeInput, posture: TodayPosture): string {
  const { resolution, verdict, adviceActionable, sportLabel } = input;
  const { phase } = resolution;

  if (!adviceActionable && isForwardAdvicePhase(phase)) {
    return 'Pas encore de verdict fiable';
  }

  switch (phase) {
    case 'MORNING':
      if (verdict === 'RECOVER') return 'Récupération prioritaire';
      if (verdict === 'TRAIN_HARD' || verdict === 'RACE_READY') return 'Journée propice à l’effort';
      if (verdict === 'TRAIN_EASY') return 'Journée modérée';
      return 'Lis ton état avant d’agir';

    case 'BEFORE_SESSION':
      return sportLabel ? `Séance ${sportLabel} à venir` : 'Séance à venir';

    case 'SESSION_COMPLETED':
      return postTrainingHeadline('SESSION_COMPLETED', input, posture);

    case 'RECOVERY_WINDOW':
      return postTrainingHeadline('RECOVERY_WINDOW', input, posture);

    case 'END_OF_DAY':
      return 'Bilan de la journée';

    default:
      return 'Aujourd’hui';
  }
}

function sublineForPhase(input: PhaseNarrativeInput, focusPriority: string | null): string {
  const { dailyStrainAvailable, sportLabel } = input;
  const phase = phaseOf(input);

  if (focusPriority && phase !== 'SESSION_COMPLETED') {
    return '';
  }

  switch (phase) {
    case 'MORNING':
      return 'Synchronise ton état avant de décider.';

    case 'BEFORE_SESSION':
      return 'Adapte l’intensité à ta forme du moment.';

    case 'SESSION_COMPLETED':
      if (!dailyStrainAvailable) {
        return 'Charge en cours de calcul — le débrief s’affine sous peu.';
      }
      return focusPriority ? '' : 'La séance est dans les jambes — place à la récupération.';

    case 'RECOVERY_WINDOW':
      return focusPriority ? '' : 'Nutrition, hydratation et sommeil : les leviers d’adaptation.';

    case 'END_OF_DAY':
      return focusPriority ? '' : 'La fenêtre de sommeil de ce soir oriente demain.';

    default:
      if (isForwardAdvicePhase(phase) && sportLabel) return sportLabel;
      return '';
  }
}

export function buildPhaseNarrative(input: PhaseNarrativeInput): PhaseNarrative {
  const phase = phaseOf(input);
  const adaptationReminders = adaptationRemindersForPhase(phase);
  const posture = resolvePosture(input);
  let focusPriority = focusPriorityForPhase(input, adaptationReminders);
  let headline = headlineForPhase(input, posture);
  const goalLine = goalLineForPhase(input);

  if (phase === 'END_OF_DAY' && input.evening) {
    const { headline: eveningHeadline, focusPriority: eveningFocusPriority } =
      buildEndOfDayNarrativeCopy({
        sportLabel: input.sportLabel,
        totalTssToday: input.totalTssToday,
        totalDurationMin: input.evening.totalDurationMin,
        effortLevel: input.evening.effortLevel,
        completedSessionCount: input.evening.completedSessionCount,
        tomorrowSession: input.evening.tomorrowSession,
        sleep: input.evening.sleep,
        recoveryStress: isRecoveryStress(input.limitingFactorMessage),
      });
    headline = eveningHeadline;
    focusPriority = eveningFocusPriority;
  }

  const narrative: PhaseNarrative = {
    heroEyebrow: PHASE_HERO_EYEBROW[phase] ?? input.resolution.primaryQuestion,
    heroHeadline: headline,
    heroSubline: sublineForPhase(input, focusPriority),
    whyFocus: input.resolution.whyFocus,
    posture,
    postureLabel: postureLabelForPhase(posture, phase) ?? '',
    focusPriority,
    goalLine,
    adaptationReminders,
  };

  assertPhaseNarrativeConsistency(phase, narrative.heroEyebrow);
  return narrative;
}

export function assertPhaseNarrativeConsistency(phase: DailyPhase, heroEyebrow: string): void {
  if (!isPostTrainingPhase(phase)) return;

  const forbidden = /entraîner fort|train hard|peux-tu t/i;
  if (forbidden.test(heroEyebrow)) {
    throw new Error(`Forward training question in post-training phase ${phase}`);
  }
}

export function pickAdaptationReminders(phase: DailyPhase, limit = 2): string[] {
  if (phase !== 'RECOVERY_WINDOW' && phase !== 'END_OF_DAY') return [];
  return ADAPTATION_REMINDERS[phase].slice(0, limit);
}
