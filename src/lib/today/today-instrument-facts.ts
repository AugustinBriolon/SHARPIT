/**
 * Today dashboard — instrument facts for Why + Limiting panels.
 * Never restate twin scores already shown in the hero (sleep / recovery / effort / adaptation).
 * Prefer a clear interpretive verdict + signals the athlete cannot read at a glance elsewhere.
 */

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DecisionData, LimitingFactor, PhysiologicalConsistency } from '@/hooks/use-today';
import { resolve, resolveCode } from '@/lib/french';
import type { OverallVerdict } from '@/lib/today/today-mapping';
import { decisionTopAction } from '@/lib/decision/projection';
import type { DailyPhaseWhyFocus } from '@/lib/daily-phase/types';

export type TodayFactRow = {
  label: string;
  value: string;
  hint?: string | null;
};

const SYSTEM_LABEL: Record<string, string> = {
  RECOVERY: 'Récupération',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
  PHYSICAL_HEALTH: 'Santé physique',
  ENVIRONMENT: 'Environnement',
};

const LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Système autonome',
  sleep: 'Sommeil',
  subjective: 'Ressenti',
  loadContext: "Charge d'entraînement",
};

/** Short interpretive posture — not the hero action verb. */
const VERDICT_WHY: Partial<Record<OverallVerdict, { value: string; hint: string }>> = {
  TRAIN_HARD: { value: 'Fenêtre haute', hint: 'les signaux tolèrent l’intensité' },
  TRAIN_SMART: { value: 'Qualité d’abord', hint: 'volume secondaire aujourd’hui' },
  TRAIN_EASY: { value: 'Garde de la marge', hint: 'charge légère, pas de push' },
  RECOVER: { value: 'Repos prioritaire', hint: 'rebond avant nouvelle charge' },
  CAUTION: { value: 'Prudence', hint: 'signaux à ne pas forcer' },
  RACE_READY: { value: 'Fenêtre performante', hint: 'forme alignée pour performer' },
};

const CONSISTENCY_VALUE: Record<PhysiologicalConsistency, string> = {
  ALIGNED: 'Alignés',
  PARTIALLY_ALIGNED: 'Partiels',
  CONFLICTING: 'Divergents',
  INSUFFICIENT_DATA: 'Incomplets',
};

const CONSISTENCY_HINT: Record<PhysiologicalConsistency, string> = {
  ALIGNED: 'mesures et ressenti cohérents',
  PARTIALLY_ALIGNED: 'légère divergence entre signaux',
  CONFLICTING: 'ressenti ≠ mesures objectives',
  INSUFFICIENT_DATA: 'pas assez de signaux croisés',
};

function limiterFromDescription(
  description: LimitingFactor['description'] | DecisionData['limitingFactor']['description'],
): string | null {
  const raw = description?.params?.limiter;
  if ((raw === undefined || raw === null)) {
    return null;
  }
  return LIMITER_LABEL[String(raw)] ?? String(raw);
}

function systemLabel(system: string | null | undefined, domain?: string | null): string | null {
  if (system && SYSTEM_LABEL[system]) {
    return SYSTEM_LABEL[system];
  }
  if (domain && SYSTEM_LABEL[domain]) {
    return SYSTEM_LABEL[domain];
  }
  return null;
}

function shortText(text: string, max = 72): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function looksLikeScoreRestatement(text: string): boolean {
  return /\b(score|\/100|\d{1,3}\s*%|récupération\s+\d|sommeil\s+\d|charge\s+\d)/i.test(text);
}

/** @deprecated Use buildTodayWhyFacts — kept for tests that assert posture copy. */
export function verdictFactValue(verdict: OverallVerdict | null | undefined): {
  value: string;
  hint: string | null;
} | null {
  if (!verdict || verdict === 'INSUFFICIENT_DATA') {
    return null;
  }
  const why = VERDICT_WHY[verdict];
  if (!why) {
    return null;
  }
  return { value: why.value, hint: why.hint };
}

const WHY_EVIDENCE_ORDER: Record<DailyPhaseWhyFocus, string[]> = {
  readiness: ['RECOVERY', 'ENVIRONMENT', 'PHYSICAL_HEALTH'],
  session_prep: ['FATIGUE', 'RECOVERY', 'DAILY_STRAIN'],
  session_review: ['DAILY_STRAIN', 'FATIGUE', 'ADAPTATION'],
  adaptation_recovery: ['RECOVERY', 'FATIGUE', 'ADAPTATION'],
  tomorrow_impact: ['ADAPTATION', 'RECOVERY', 'ENVIRONMENT'],
};

function sortEvidenceForFocus(
  evidence: NonNullable<DecisionData['supportingEvidence']>,
  whyFocus: DailyPhaseWhyFocus,
) {
  const prefs = WHY_EVIDENCE_ORDER[whyFocus];
  return [...evidence].sort((a, b) => {
    const rankDiff = (a.rank ?? 99) - (b.rank ?? 99);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const ai = prefs.indexOf(a.domain);
    const bi = prefs.indexOf(b.domain);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function resolveEvidenceDetail(
  item: NonNullable<DecisionData['supportingEvidence']>[number],
): string | null {
  const [firstItem] = item.evidenceItems;
  if (!firstItem) {
    return null;
  }
  const detailRaw = resolve(firstItem);
  if (!detailRaw || detailRaw === firstItem.code || looksLikeScoreRestatement(detailRaw)) {
    return null;
  }
  return shortText(detailRaw, 64);
}

function evidenceItemToFact(item: NonNullable<DecisionData['supportingEvidence']>[number]): TodayFactRow | null {
  const title = resolve(item.title);
  if (!title || title === item.title.code || looksLikeScoreRestatement(title)) {
    return null;
  }

  return {
    label: 'À noter',
    value: shortText(title, 40),
    hint: resolveEvidenceDetail(item),
  };
}

function pickWhyEvidence(
  decision: DecisionData | null | undefined,
  whyFocus: DailyPhaseWhyFocus,
): TodayFactRow | null {
  const evidence = decision?.supportingEvidence;
  if (!evidence?.length) {
    return null;
  }

  for (const item of sortEvidenceForFocus(evidence, whyFocus).slice(0, 3)) {
    const fact = evidenceItemToFact(item);
    if (fact) {
      return fact;
    }
  }

  return null;
}

function addPostureWhyFact(
  facts: TodayFactRow[],
  verdict: OverallVerdict | null | undefined,
  decision?: DecisionData | null,
): void {
  const posture = verdictFactValue(verdict);
  if (posture) {
    facts.push({ label: 'Pourquoi', value: posture.value, hint: posture.hint });
    return;
  }

  const top = decisionTopAction(decision);
  if (!top) {
    return;
  }
  const rationale = resolveCode(top.rationaleCode);
  if (rationale && rationale !== top.rationaleCode && !looksLikeScoreRestatement(rationale)) {
    facts.push({ label: 'Pourquoi', value: shortText(rationale, 48) });
  }
}

function shouldSkipEvidenceNote(
  note: TodayFactRow,
  consistency: PhysiologicalConsistency | null | undefined,
): boolean {
  return (
    consistency === 'CONFLICTING' &&
    /divergent|contradictoire|align/i.test(`${note.value} ${note.hint ?? ''}`)
  );
}

export function buildTodayWhyFacts(input: {
  verdict: OverallVerdict | null | undefined;
  consistency: PhysiologicalConsistency | null | undefined;
  decision?: DecisionData | null;
  whyFocus?: DailyPhaseWhyFocus | null;
}): TodayFactRow[] {
  const facts: TodayFactRow[] = [];
  const whyFocus = input.whyFocus ?? 'readiness';

  addPostureWhyFact(facts, input.verdict, input.decision);

  if (input.consistency && input.consistency !== 'ALIGNED') {
    facts.push({
      label: 'Signaux',
      value: CONSISTENCY_VALUE[input.consistency],
      hint: CONSISTENCY_HINT[input.consistency],
    });
  }

  const note = pickWhyEvidence(input.decision ?? null, whyFocus);
  if (note && !shouldSkipEvidenceNote(note, input.consistency)) {
    facts.push(note);
  }

  return facts.slice(0, 3);
}

/**
 * Limiting panel = constraint identity only (system + cause).
 * No twin scores — those live in the hero metrics row.
 */
export function buildTodayLimitingFacts(input: {
  limitingFactor: AthleteSnapshot['limitingFactor'] | DecisionData['limitingFactor'] | null;
  reminders?: string[];
}): { facts: TodayFactRow[]; emptyText: string | null } {
  const { limitingFactor, reminders = [] } = input;

  if (limitingFactor) {
    const frein =
      systemLabel(
        limitingFactor.system,
        'domain' in limitingFactor ? limitingFactor.domain : null,
      ) ?? 'Signaux';
    const cause = limiterFromDescription(limitingFactor.description);

    const facts: TodayFactRow[] = [
      { label: 'Frein', value: frein },
      ...(cause ? [{ label: 'Cause', value: cause }] : []),
    ];

    return { facts, emptyText: null };
  }

  if (reminders.length > 0) {
    return {
      facts: reminders.slice(0, 3).map((hint, i) => ({
        label: i === 0 ? 'Levier' : 'Aussi',
        value: hint,
      })),
      emptyText: null,
    };
  }

  return {
    facts: [],
    emptyText: 'Aucun frein majeur aujourd’hui.',
  };
}
