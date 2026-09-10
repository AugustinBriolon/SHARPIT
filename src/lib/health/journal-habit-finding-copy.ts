import { DAY_CONTEXT_FACTORS } from '@/lib/health/day-context-factors';
import type {
  CompiledJournalHabitFinding,
  JournalHabitFinding,
  JournalOutcomeKey,
} from '@/lib/health/journal-habit-analysis';
import { journalTrackableById } from '@/lib/health/journal-trackables';

const OUTCOME_LABELS: Record<JournalOutcomeKey, string> = {
  sleepMinutes: 'sommeil',
  recoveryScore: 'récupération',
  bodyBattery: 'Body Battery',
};

export function journalFactorDisplayLabel(factorId: string): string {
  const trackable = journalTrackableById(factorId);
  if (trackable) {
    return trackable.label;
  }
  const factor = DAY_CONTEXT_FACTORS.find((item) => item.id === factorId);
  if (factor) {
    return factor.label;
  }
  if (factorId.startsWith('custom_')) {
    return 'Élément perso';
  }
  return factorId;
}

function formatOutcomeValue(outcome: JournalOutcomeKey, value: number): string {
  if (outcome === 'sleepMinutes') {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return `${hours} h ${minutes.toString().padStart(2, '0')}`;
  }
  return `${Math.round(value)}`;
}

export function confidenceLabel(confidence: 'high' | 'medium'): string {
  return confidence === 'high' ? 'Association nette' : 'À confirmer';
}

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

function directionWord(polarity: 'plus' | 'minus'): string {
  return polarity === 'minus' ? 'plus bas' : 'plus haut';
}

export function formatJournalHabitFinding(finding: JournalHabitFinding): {
  title: string;
  detail: string;
  confidenceLabel: string;
} {
  const habit = journalFactorDisplayLabel(finding.factorId);
  const outcome = OUTCOME_LABELS[finding.outcome];
  const withHabit = formatOutcomeValue(finding.outcome, finding.medianYes);
  const withoutHabit = formatOutcomeValue(finding.outcome, finding.medianNo);
  const lagNote =
    finding.lagDays > 0 ? ` Mesure ${outcome} le lendemain (+${finding.lagDays} j).` : '';

  return {
    title: `${habit} · ${outcome} ${directionWord(finding.polarity)}`,
    detail: `Médiane avec ${habit.toLowerCase()} : ${withHabit}, sans : ${withoutHabit} · ${finding.nYes} vs ${finding.nNo} jours.${lagNote}`,
    confidenceLabel: confidenceLabel(finding.confidence),
  };
}

export function formatCompiledJournalHabitFinding(finding: CompiledJournalHabitFinding): {
  title: string;
  detail: string;
  confidenceLabel: string;
} {
  const habit = journalFactorDisplayLabel(finding.factorId);
  const outcomeOrder: JournalOutcomeKey[] = ['sleepMinutes', 'recoveryScore', 'bodyBattery'];
  const effects = [...finding.effects].sort(
    (a, b) => outcomeOrder.indexOf(a.outcome) - outcomeOrder.indexOf(b.outcome),
  );
  const outcomes = effects.map((effect) => effect.outcome);
  const outcomePhrase = joinOutcomeLabels(outcomes);
  const direction = directionWord(finding.polarity);

  const medianBits = effects.map((effect) => {
    const label = OUTCOME_LABELS[effect.outcome];
    const withHabit = formatOutcomeValue(effect.outcome, effect.medianYes);
    const withoutHabit = formatOutcomeValue(effect.outcome, effect.medianNo);
    const lag = effect.lagDays > 0 ? ` (mesure ${label} +${effect.lagDays} j)` : '';
    return `${label} ${withHabit} vs ${withoutHabit}${lag} · ${effect.nYes}/${effect.nNo} j`;
  });

  return {
    title: `${habit} · ${outcomePhrase} ${direction}`,
    detail: `Médiane avec vs sans : ${medianBits.join(' · ')}.`,
    confidenceLabel: confidenceLabel(finding.confidence),
  };
}
