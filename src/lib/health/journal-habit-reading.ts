import {
  compileJournalHabitFindings,
  partitionCompiledFindings,
  type CompiledJournalHabitFinding,
  type JournalHabitFinding,
} from '@/lib/health/journal-habit-analysis';
import {
  formatCompiledJournalHabitFinding,
  journalFactorDisplayLabel,
} from '@/lib/health/journal-habit-finding-copy';

export type JournalHabitReadingHighlight = {
  factorId: string;
  title: string;
  polarity: 'plus' | 'minus';
  confidence: 'high' | 'medium';
};

export type JournalHabitReading = {
  daysWithSignal: number;
  netCount: number;
  weakCount: number;
  empty: boolean;
  headline: string;
  summary: string;
  priority: (CompiledJournalHabitFinding & { title: string; detail: string }) | null;
  highlights: JournalHabitReadingHighlight[];
  actionHint: string;
};

const MAX_HIGHLIGHTS = 4;

function pickPriority(
  compiled: readonly CompiledJournalHabitFinding[],
): CompiledJournalHabitFinding | null {
  const { plusHigh, minusHigh, plusMedium, minusMedium } = partitionCompiledFindings(compiled);
  return minusHigh[0] ?? plusHigh[0] ?? minusMedium[0] ?? plusMedium[0] ?? null;
}

function buildHeadline(netCount: number, weakCount: number): string {
  if (netCount === 0 && weakCount === 0) {
    return 'Aucune association nette pour l’instant';
  }
  if (netCount === 0) {
    return weakCount === 1 ? 'Une piste à confirmer' : `${weakCount} pistes encore fragiles`;
  }
  if (netCount === 1) {
    return weakCount > 0
      ? '1 association nette · pistes à confirmer'
      : '1 association nette à surveiller';
  }
  return weakCount > 0
    ? `${netCount} associations nettes · pistes à confirmer`
    : `${netCount} associations nettes à surveiller`;
}

function buildSummary(daysWithSignal: number, netCount: number, weakCount: number): string {
  const parts = [`${daysWithSignal} jours analysés`];
  if (netCount > 0) {
    parts.push(`${netCount} nette${netCount > 1 ? 's' : ''}`);
  }
  if (weakCount > 0) {
    parts.push(`${weakCount} à confirmer`);
  }
  return parts.join(' · ');
}

function buildActionHint(priority: CompiledJournalHabitFinding | null): string {
  if (!priority) {
    return 'Les constantes (toujours / jamais) ne créent pas de contraste — varie un levier à la fois pendant 7 jours.';
  }
  const habit = journalFactorDisplayLabel(priority.factorId);
  if (priority.polarity === 'minus') {
    return `Teste 7 jours sans « ${habit} » (ou en réduisant), puis compare sommeil et récupération.`;
  }
  return `Garde « ${habit} » quand tu peux — le contraste observé va dans le bon sens.`;
}

function buildHighlights(
  compiled: readonly CompiledJournalHabitFinding[],
): JournalHabitReadingHighlight[] {
  const { plusHigh, minusHigh, plusMedium, minusMedium } = partitionCompiledFindings(compiled);
  const ordered = [...minusHigh, ...plusHigh, ...minusMedium, ...plusMedium];
  return ordered.slice(0, MAX_HIGHLIGHTS).map((item) => ({
    factorId: item.factorId,
    title: formatCompiledJournalHabitFinding(item).title,
    polarity: item.polarity,
    confidence: item.confidence,
  }));
}

/**
 * Deterministic athlete-facing reading of habit↔physiology associations.
 * Presentation only — no causation claim, no Core engine.
 */
export function buildJournalHabitReading(
  findings: readonly JournalHabitFinding[],
  daysWithSignal: number,
): JournalHabitReading {
  const compiled = compileJournalHabitFindings(findings);
  const { plusHigh, minusHigh, plusMedium, minusMedium } = partitionCompiledFindings(compiled);
  const netCount = plusHigh.length + minusHigh.length;
  const weakCount = plusMedium.length + minusMedium.length;
  const empty = netCount === 0 && weakCount === 0;
  const priorityFinding = pickPriority(compiled);
  const priorityCopy = priorityFinding ? formatCompiledJournalHabitFinding(priorityFinding) : null;

  return {
    daysWithSignal,
    netCount,
    weakCount,
    empty,
    headline: buildHeadline(netCount, weakCount),
    summary: buildSummary(daysWithSignal, netCount, weakCount),
    priority:
      priorityFinding && priorityCopy
        ? {
            ...priorityFinding,
            title: priorityCopy.title,
            detail: priorityCopy.detail,
          }
        : null,
    highlights: buildHighlights(compiled),
    actionHint: buildActionHint(priorityFinding),
  };
}
