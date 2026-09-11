import type { DailyPhase } from '@/lib/daily-phase/types';
import type { TodayGoalContext } from '@/lib/daily-phase/goal-context';
import type { TodayFactRow } from '@/lib/today/dashboard/today-instrument-facts';
import { whyBlockTitle } from '@/lib/today/rich/today-rich-view';

/**
 * Assembles the Today whyBlock for the hub.
 * Avoids a posture-only block that restates the verdict plate; surfaces
 * habit journal lever when present, plus non-redundant signal / evidence facts.
 * Session→goal fact is omitted (goal anchor / séance→objectif unmounted from Today).
 */
export function assembleTodayWhyBlock(input: {
  phase: DailyPhase;
  whyFacts: TodayFactRow[];
  goalContext: TodayGoalContext | null;
  /** Journal association or running habit test — coaching signal, not Core. */
  habitFact?: TodayFactRow | null;
}): {
  title: string;
  lines: string[];
  facts: TodayFactRow[];
  visible: boolean;
} {
  const facts: TodayFactRow[] = [];

  // Retained for call-site stability; no longer injects « Séance · Sert … ».
  void input.goalContext;

  if (input.habitFact) {
    facts.push(input.habitFact);
  }

  for (const fact of input.whyFacts) {
    if (fact.label === 'Pourquoi') {
      continue;
    }
    facts.push(fact);
  }

  const lines = facts.map((f) =>
    f.hint ? `${f.label} · ${f.value} (${f.hint})` : `${f.label} · ${f.value}`,
  );

  return {
    title: whyBlockTitle(input.phase),
    lines,
    facts: facts.slice(0, 3),
    visible: facts.length > 0,
  };
}
