import type { OverallVerdict } from '@/lib/today-mapping';
import type { DailyPhase, DailyPhaseResolution, DailyPhaseWhyFocus } from '@/lib/daily-phase/types';
import { isForwardAdvicePhase, isPostTrainingPhase } from '@/lib/daily-phase/resolve';

export type PhaseNarrativeInput = {
  resolution: DailyPhaseResolution;
  verdict: OverallVerdict;
  adviceActionable: boolean;
  actionLine: string | null;
  sportLabel: string | null;
  totalTssToday: number | null;
  dailyStrainScore: number | null;
  dailyStrainAvailable: boolean;
};

export type PhaseNarrative = {
  heroEyebrow: string;
  heroHeadline: string;
  heroSubline: string;
  whyFocus: DailyPhaseWhyFocus;
  adaptationReminders: string[];
};

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

function headlineForPhase(input: PhaseNarrativeInput): string {
  const {
    resolution,
    verdict,
    adviceActionable,
    sportLabel,
    totalTssToday,
    dailyStrainScore,
    dailyStrainAvailable,
  } = input;
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

    case 'SESSION_COMPLETED': {
      if (sportLabel && totalTssToday != null) {
        return `${sportLabel} · ${totalTssToday} TSS`;
      }
      if (sportLabel) return `${sportLabel} — séance enregistrée`;
      return 'Séance enregistrée';
    }

    case 'RECOVERY_WINDOW':
      if (dailyStrainAvailable && dailyStrainScore != null) {
        return `Charge du jour : ${dailyStrainScore} — fenêtre d’adaptation ouverte`;
      }
      return 'Maximise l’adaptation maintenant';

    case 'END_OF_DAY':
      return 'Bilan pour demain';

    default:
      return 'Aujourd’hui';
  }
}

function sublineForPhase(input: PhaseNarrativeInput): string {
  const { actionLine, dailyStrainAvailable, resolution, sportLabel } = input;
  const { phase } = resolution;
  const forward = isForwardAdvicePhase(phase);

  switch (phase) {
    case 'MORNING':
      return actionLine ?? 'Synchronise ton état avant de décider.';

    case 'BEFORE_SESSION':
      return actionLine ?? 'Adapte l’intensité à ta forme du moment.';

    case 'SESSION_COMPLETED':
      if (!dailyStrainAvailable) {
        return 'Charge en cours de calcul — le débrief s’affine sous peu.';
      }
      return 'La séance est dans les jambes — place à la récupération.';

    case 'RECOVERY_WINDOW':
      return 'Nutrition, hydratation et sommeil : les leviers d’adaptation.';

    case 'END_OF_DAY':
      return 'Ce que tu fais ce soir influence demain matin.';

    default: {
      if (forward && actionLine) return actionLine;
      if (sportLabel) return sportLabel;
      return '';
    }
  }
}

export function buildPhaseNarrative(input: PhaseNarrativeInput): PhaseNarrative {
  const { resolution } = input;
  const { phase } = resolution;

  const adaptationReminders =
    phase === 'RECOVERY_WINDOW' || phase === 'END_OF_DAY' ? ADAPTATION_REMINDERS[phase] : [];

  const narrative: PhaseNarrative = {
    heroEyebrow: resolution.primaryQuestion,
    heroHeadline: headlineForPhase(input),
    heroSubline: sublineForPhase(input),
    whyFocus: resolution.whyFocus,
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
