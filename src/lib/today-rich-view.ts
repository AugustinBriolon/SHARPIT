import type { AdaptationData, KeyFinding, ReasoningData, TopAction } from '@/hooks/use-today';
import type { DailyPhase, DailyPhaseWhyFocus } from '@/lib/daily-phase/types';
import { isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import { resolve, resolveCode } from '@/lib/french';
import { ADAPTATION_STATUS_SIGNAL } from '@/lib/today-dashboard-labels';
import { mapVerdictToDisplay } from '@/lib/today-mapping';
import type { OverallVerdict } from '@/lib/today-mapping';

export function buildTopActionLine(topAction: TopAction | null): string | null {
  if (!topAction) return null;
  const verb = resolveCode(topAction.verbCode);
  const focus = resolveCode(topAction.focusCode);
  if (!verb || verb === topAction.verbCode) return null;
  return focus && focus !== topAction.focusCode ? `${verb} — ${focus}` : verb;
}

export function buildWhyEvidence(
  reasoning: ReasoningData | null,
  briefing: string | null | undefined,
  whyFocus: DailyPhaseWhyFocus = 'readiness',
): string[] {
  const lines: string[] = [];

  if (reasoning?.keyFindings?.length) {
    const prioritized = prioritizeFindings(reasoning.keyFindings, whyFocus);
    for (const finding of prioritized.slice(0, 2)) {
      lines.push(resolve(finding.title));
      for (const item of finding.evidenceItems.slice(0, 1)) {
        const text = resolve(item);
        if (text && text !== item.code) lines.push(text);
      }
    }
    if (lines.length > 0) return lines.slice(0, 3);
  }

  if (whyFocus === 'adaptation_recovery' || whyFocus === 'tomorrow_impact') {
    if (briefing) {
      const paragraphs = briefing
        .split('\n')
        .map((p) => p.replace(/\*\*/g, '').trim())
        .filter(Boolean);
      return paragraphs.slice(-2);
    }
  }

  if (briefing && (whyFocus === 'readiness' || whyFocus === 'session_prep')) {
    const paragraphs = briefing
      .split('\n')
      .map((p) => p.replace(/\*\*/g, '').trim())
      .filter(Boolean);
    return paragraphs.slice(0, 2);
  }

  if (reasoning?.topAction) {
    const rationale = resolveCode(reasoning.topAction.rationaleCode);
    if (rationale && rationale !== reasoning.topAction.rationaleCode) {
      lines.push(rationale);
    }
  }

  return lines;
}

function prioritizeFindings(findings: ReasoningData['keyFindings'], whyFocus: DailyPhaseWhyFocus) {
  const order: Record<DailyPhaseWhyFocus, string[]> = {
    readiness: ['recovery', 'sleep', 'readiness'],
    session_prep: ['fatigue', 'recovery', 'load'],
    session_review: ['load', 'fatigue', 'training'],
    adaptation_recovery: ['recovery', 'fatigue', 'adaptation'],
    tomorrow_impact: ['adaptation', 'recovery', 'sleep'],
  };
  const prefs = order[whyFocus];
  return [...findings].sort((a, b) => {
    const ai = prefs.indexOf(a.category);
    const bi = prefs.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function actionRowLabels(phase: DailyPhase): {
  limiting: string;
  action: string;
} {
  switch (phase) {
    case 'BEFORE_SESSION':
      return {
        limiting: 'Ce qui peut impacter ta séance',
        action: 'Séance du jour',
      };
    case 'SESSION_COMPLETED':
      return {
        limiting: 'Impact sur ta progression',
        action: 'Ce que tu as fait',
      };
    case 'RECOVERY_WINDOW':
      return {
        limiting: 'Leviers d’adaptation',
        action: 'Prochaines actions',
      };
    case 'END_OF_DAY':
      return {
        limiting: 'Ce qui influence demain',
        action: 'Bilan du jour',
      };
    default:
      return {
        limiting: 'Ce qui limite ta progression',
        action: 'Que faire aujourd’hui ?',
      };
  }
}

export function trajectoryEyebrow(phase: DailyPhase): string {
  switch (phase) {
    case 'SESSION_COMPLETED':
      return 'Impact sur la semaine';
    case 'RECOVERY_WINDOW':
    case 'END_OF_DAY':
      return 'Tendance avant demain';
    default:
      return 'Est-ce que je progresse ?';
  }
}

export function whyBlockTitle(phase: DailyPhase): string {
  switch (phase) {
    case 'SESSION_COMPLETED':
      return 'Ce que la séance a produit';
    case 'RECOVERY_WINDOW':
      return 'Pourquoi récupérer maintenant ?';
    case 'END_OF_DAY':
      return 'Ce que la journée implique';
    case 'BEFORE_SESSION':
      return 'Contexte avant séance';
    default:
      return 'Pourquoi ?';
  }
}

export function shouldShowForwardTrainingCopy(phase: DailyPhase): boolean {
  return isForwardAdvicePhase(phase);
}

function adaptationTrendArrow(trend: AdaptationData['adaptationTrend']): string {
  if (trend === 'IMPROVING') return '↑';
  if (trend === 'DECLINING') return '↓';
  return '→';
}

function adaptationTrendClass(trend: AdaptationData['adaptationTrend']): string {
  if (trend === 'IMPROVING') return 'text-emerald-600 dark:text-emerald-400';
  if (trend === 'DECLINING') return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-400';
}

export function buildProgressionSummary(
  adaptation: AdaptationData | null,
  weeklyLoad: number,
): {
  headline: string;
  detail: string | null;
  trendArrow: string;
  trendClass: string;
} {
  if (!adaptation || adaptation.adaptationStatus === 'INSUFFICIENT_DATA') {
    return {
      headline: 'Historique en cours de construction',
      detail: weeklyLoad > 0 ? `${weeklyLoad} TSS cette semaine` : null,
      trendArrow: '→',
      trendClass: 'text-slate-400',
    };
  }

  const status = ADAPTATION_STATUS_SIGNAL[adaptation.adaptationStatus];
  const trendArrow = adaptationTrendArrow(adaptation.adaptationTrend);
  const trendClass = adaptationTrendClass(adaptation.adaptationTrend);

  const headline = status?.label ?? adaptation.adaptationStatus;
  const index = adaptation.adaptationIndex != null ? ` · indice ${adaptation.adaptationIndex}` : '';
  const load = weeklyLoad > 0 ? `${weeklyLoad} TSS cette semaine` : null;

  return {
    headline: `${headline}${index}`,
    detail: load,
    trendArrow,
    trendClass,
  };
}

export function verdictHeadline(verdict: OverallVerdict, adviceActionable: boolean): string {
  if (!adviceActionable) return 'Pas encore de verdict fiable';
  return mapVerdictToDisplay(verdict).label;
}

export function canTrainHardAnswer(verdict: OverallVerdict, adviceActionable: boolean): string {
  if (!adviceActionable) {
    return 'SHARPIT n’a pas encore assez de signaux pour répondre.';
  }
  switch (verdict) {
    case 'TRAIN_HARD':
    case 'RACE_READY':
      return 'Oui — ta physiologie supporte une séance exigeante.';
    case 'TRAIN_SMART':
      return 'Oui — avec une séance ciblée et maîtrisée.';
    case 'TRAIN_EASY':
      return 'Légèrement — reste en endurance ou technique.';
    case 'CAUTION':
      return 'Avec prudence — réduis l’intensité prévue.';
    case 'RECOVER':
      return 'Non — la récupération est prioritaire aujourd’hui.';
    default:
      return 'Réponse indisponible pour l’instant.';
  }
}

export type { KeyFinding };
