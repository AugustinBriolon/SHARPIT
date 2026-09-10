/**
 * Journal habit × physiology associations — presentation analytics only (no Core).
 *
 * Scientific framing (n=1 athlete mirror):
 * - Association, not causation. Confounders (load, travel, illness) are not controlled.
 * - Null / unset excluded. Constant habits (always yes / always no) yield no contrast.
 * - Central tendency = median (robust to outliers).
 * - Factor→outcome lag: prior-night factors align with same-day sleep; alcohol (+ caffeine
 *   sleep) use +1 day so the morning metric after the night is compared.
 * - Multiple outcomes per factor allowed; recoveryScore vs bodyBattery collapsed when
 *   redundant (same polarity) to limit multiple-testing noise.
 */

import { isDayContextFactorId, isPriorNightFactor } from '@/lib/health/day-context-factors';

export type RecordedFactor = 'yes' | 'no';

export type JournalOutcomeKey = 'sleepMinutes' | 'recoveryScore' | 'bodyBattery';

export type ObservationConfidence = 'high' | 'medium' | 'none';

export type ObservationPolarity = 'plus' | 'minus';

export type JournalAnalysisDay = {
  trainingDayId: string;
  factors: Record<string, RecordedFactor | null>;
  sleepMinutes: number | null;
  recoveryScore: number | null;
  bodyBattery: number | null;
};

export type FactorOutcomeEffect = {
  factorId: string;
  outcome: JournalOutcomeKey;
  nYes: number;
  nNo: number;
  /** Median outcome when habit = yes. */
  medianYes: number;
  /** Median outcome when habit = no. */
  medianNo: number;
  absDelta: number;
  /** Habit present associated with better (plus) or worse (minus) outcome. */
  polarity: ObservationPolarity;
  confidence: ObservationConfidence;
  lagDays: number;
};

export type JournalHabitFinding = {
  kind: 'effect';
  factorId: string;
  outcome: JournalOutcomeKey;
  nYes: number;
  nNo: number;
  medianYes: number;
  medianNo: number;
  absDelta: number;
  polarity: ObservationPolarity;
  confidence: 'high' | 'medium';
  lagDays: number;
};

/** One athlete-facing row: same habit + polarity, possibly several outcomes. */
export type CompiledJournalHabitFinding = {
  kind: 'compiled';
  factorId: string;
  polarity: ObservationPolarity;
  confidence: 'high' | 'medium';
  effects: JournalHabitFinding[];
};

const OUTCOMES: JournalOutcomeKey[] = ['sleepMinutes', 'recoveryScore', 'bodyBattery'];

/** Minimum |median_yes − median_no| to treat as a meaningful gap. */
export const MIN_ABS_DELTA: Record<JournalOutcomeKey, number> = {
  sleepMinutes: 40,
  recoveryScore: 10,
  bodyBattery: 10,
};

/** Solid association: both arms well sampled. */
export const MIN_N_PER_GROUP_HIGH = 5;

/** Early signal only. */
export const MIN_N_PER_GROUP_MEDIUM = 3;

export function recordedFactorValue(state: string | null | undefined): RecordedFactor | null {
  return state === 'yes' || state === 'no' ? state : null;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Days to shift the outcome relative to the factor's training day.
 * Alcohol on calendar day J → sleep / morning readiness of J+1.
 * Prior-night factors already describe the night ending on morning J → lag 0 for sleep.
 */
export function outcomeLagDays(factorId: string, outcome: JournalOutcomeKey): number {
  if (isDayContextFactorId(factorId) && isPriorNightFactor(factorId)) {
    return 0;
  }
  if (factorId === 'alcohol') {
    return 1;
  }
  if (factorId === 'coffee' && outcome === 'sleepMinutes') {
    return 1;
  }
  return 0;
}

export function shiftTrainingDayId(trainingDayId: string, deltaDays: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return null;
  }
  const [y, m, d] = trainingDayId.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function outcomeValue(day: JournalAnalysisDay, outcome: JournalOutcomeKey): number | null {
  return day[outcome];
}

export function scoreObservationConfidence(input: {
  nYes: number;
  nNo: number;
  absDelta: number;
  outcome: JournalOutcomeKey;
}): ObservationConfidence {
  const { nYes, nNo, absDelta, outcome } = input;
  const threshold = MIN_ABS_DELTA[outcome];
  const minN = Math.min(nYes, nNo);
  const total = nYes + nNo;

  if (minN < MIN_N_PER_GROUP_MEDIUM || absDelta < threshold * 0.8) {
    return 'none';
  }

  const sampleScore = Math.min(1, total / 16) * Math.min(1, minN / MIN_N_PER_GROUP_HIGH);
  const effectScore = Math.min(1, absDelta / (threshold * 1.5));
  const score = sampleScore * 0.6 + effectScore * 0.4;

  return confidenceFromScore({ minN, absDelta, threshold, score });
}

function confidenceFromScore(input: {
  minN: number;
  absDelta: number;
  threshold: number;
  score: number;
}): ObservationConfidence {
  const { minN, absDelta, threshold, score } = input;
  if (minN >= MIN_N_PER_GROUP_HIGH && absDelta >= threshold && score >= 0.72) {
    return 'high';
  }
  if (minN >= MIN_N_PER_GROUP_MEDIUM && absDelta >= threshold * 0.9 && score >= 0.5) {
    return 'medium';
  }
  return 'none';
}

function indexDaysById(days: readonly JournalAnalysisDay[]): Map<string, JournalAnalysisDay> {
  const map = new Map<string, JournalAnalysisDay>();
  for (const day of days) {
    map.set(day.trainingDayId, day);
  }
  return map;
}

function laggedOutcomeValue(
  day: JournalAnalysisDay,
  byId: Map<string, JournalAnalysisDay>,
  outcome: JournalOutcomeKey,
  lagDays: number,
): number | null {
  const outcomeDayId = shiftTrainingDayId(day.trainingDayId, lagDays);
  if (!outcomeDayId) {
    return null;
  }
  const outcomeDay = lagDays === 0 ? day : byId.get(outcomeDayId);
  return outcomeDay ? outcomeValue(outcomeDay, outcome) : null;
}

function splitOutcomeByFactor(
  days: readonly JournalAnalysisDay[],
  factorId: string,
  outcome: JournalOutcomeKey,
  lagDays: number,
): { yesValues: number[]; noValues: number[] } {
  const byId = indexDaysById(days);
  const yesValues: number[] = [];
  const noValues: number[] = [];

  for (const day of days) {
    const factor = day.factors[factorId] ?? null;
    const value = factor === null ? null : laggedOutcomeValue(day, byId, outcome, lagDays);
    if (value === null) {
      continue;
    }
    (factor === 'yes' ? yesValues : noValues).push(value);
  }

  return { yesValues, noValues };
}

export function compareFactorOutcome(
  days: readonly JournalAnalysisDay[],
  factorId: string,
  outcome: JournalOutcomeKey,
): FactorOutcomeEffect | null {
  const lagDays = outcomeLagDays(factorId, outcome);
  const { yesValues, noValues } = splitOutcomeByFactor(days, factorId, outcome, lagDays);

  if (yesValues.length === 0 || noValues.length === 0) {
    return null;
  }

  const medianYes = median(yesValues);
  const medianNo = median(noValues);
  const absDelta = Math.abs(medianYes - medianNo);
  const polarity: ObservationPolarity = medianYes >= medianNo ? 'plus' : 'minus';
  const confidence = scoreObservationConfidence({
    nYes: yesValues.length,
    nNo: noValues.length,
    absDelta,
    outcome,
  });

  return {
    factorId,
    outcome,
    nYes: yesValues.length,
    nNo: noValues.length,
    medianYes,
    medianNo,
    absDelta,
    polarity,
    confidence,
    lagDays,
  };
}

function collectFactorIds(days: readonly JournalAnalysisDay[]): string[] {
  const ids = new Set<string>();
  for (const day of days) {
    for (const [id, value] of Object.entries(day.factors)) {
      if (value !== null) {
        ids.add(id);
      }
    }
  }
  return [...ids].sort();
}

function confidenceRank(confidence: 'high' | 'medium'): number {
  return confidence === 'high' ? 2 : 1;
}

function relativeEffect(effect: FactorOutcomeEffect): number {
  return effect.absDelta / MIN_ABS_DELTA[effect.outcome];
}

/**
 * Keep sleep freely; between recoveryScore and bodyBattery for the same factor+polarity,
 * keep only the stronger signal (reduces Garmin-composite double counting).
 */
export function collapseRedundantRecoveryFindings(
  findings: readonly JournalHabitFinding[],
): JournalHabitFinding[] {
  const kept: JournalHabitFinding[] = [];
  const recoveryKeys = new Set<string>();

  const sorted = [...findings].sort((a, b) => {
    const conf = confidenceRank(b.confidence) - confidenceRank(a.confidence);
    if (conf !== 0) {
      return conf;
    }
    return b.absDelta / MIN_ABS_DELTA[b.outcome] - a.absDelta / MIN_ABS_DELTA[a.outcome];
  });

  for (const finding of sorted) {
    if (finding.outcome === 'sleepMinutes') {
      kept.push(finding);
      continue;
    }
    if (finding.outcome === 'recoveryScore' || finding.outcome === 'bodyBattery') {
      const key = `${finding.factorId}:${finding.polarity}`;
      if (recoveryKeys.has(key)) {
        continue;
      }
      recoveryKeys.add(key);
      kept.push(finding);
      continue;
    }
    kept.push(finding);
  }

  return kept.sort((a, b) => {
    const conf = confidenceRank(b.confidence) - confidenceRank(a.confidence);
    if (conf !== 0) {
      return conf;
    }
    return relativeEffect(b as FactorOutcomeEffect) - relativeEffect(a as FactorOutcomeEffect);
  });
}

/**
 * Build athlete-facing associations: every solid factor×outcome effect after lag + filters.
 */
export function buildJournalHabitFindings(
  days: readonly JournalAnalysisDay[],
): JournalHabitFinding[] {
  const raw: JournalHabitFinding[] = [];

  for (const factorId of collectFactorIds(days)) {
    for (const outcome of OUTCOMES) {
      const effect = compareFactorOutcome(days, factorId, outcome);
      if (!effect || effect.confidence === 'none') {
        continue;
      }
      raw.push({
        kind: 'effect',
        factorId: effect.factorId,
        outcome: effect.outcome,
        nYes: effect.nYes,
        nNo: effect.nNo,
        medianYes: effect.medianYes,
        medianNo: effect.medianNo,
        absDelta: effect.absDelta,
        polarity: effect.polarity,
        confidence: effect.confidence,
        lagDays: effect.lagDays,
      });
    }
  }

  return collapseRedundantRecoveryFindings(raw);
}

export function partitionHabitFindings(findings: readonly JournalHabitFinding[]): {
  plusHigh: JournalHabitFinding[];
  minusHigh: JournalHabitFinding[];
  plusMedium: JournalHabitFinding[];
  minusMedium: JournalHabitFinding[];
} {
  const plusHigh: JournalHabitFinding[] = [];
  const minusHigh: JournalHabitFinding[] = [];
  const plusMedium: JournalHabitFinding[] = [];
  const minusMedium: JournalHabitFinding[] = [];

  for (const finding of findings) {
    if (finding.confidence === 'high' && finding.polarity === 'plus') {
      plusHigh.push(finding);
    } else if (finding.confidence === 'high' && finding.polarity === 'minus') {
      minusHigh.push(finding);
    } else if (finding.polarity === 'plus') {
      plusMedium.push(finding);
    } else {
      minusMedium.push(finding);
    }
  }

  return { plusHigh, minusHigh, plusMedium, minusMedium };
}

/**
 * Collapse same habit + polarity across outcomes into one row
 * (e.g. sleep + recovery both lower → a single athlete-facing association).
 * Opposite polarities stay separate.
 */
export function compileJournalHabitFindings(
  findings: readonly JournalHabitFinding[],
): CompiledJournalHabitFinding[] {
  const groups = new Map<string, JournalHabitFinding[]>();

  for (const finding of findings) {
    const key = `${finding.factorId}:${finding.polarity}`;
    const list = groups.get(key);
    if (list) {
      list.push(finding);
    } else {
      groups.set(key, [finding]);
    }
  }

  const compiled: CompiledJournalHabitFinding[] = [];
  for (const effects of groups.values()) {
    const sortedEffects = [...effects].sort(
      (a, b) => relativeEffect(b as FactorOutcomeEffect) - relativeEffect(a as FactorOutcomeEffect),
    );
    const primary = sortedEffects[0]!;
    compiled.push({
      kind: 'compiled',
      factorId: primary.factorId,
      polarity: primary.polarity,
      confidence: sortedEffects.some((e) => e.confidence === 'high') ? 'high' : 'medium',
      effects: sortedEffects,
    });
  }

  return compiled.sort((a, b) => {
    const conf = confidenceRank(b.confidence) - confidenceRank(a.confidence);
    if (conf !== 0) {
      return conf;
    }
    return (
      relativeEffect(b.effects[0]! as FactorOutcomeEffect) -
      relativeEffect(a.effects[0]! as FactorOutcomeEffect)
    );
  });
}

export function partitionCompiledFindings(findings: readonly CompiledJournalHabitFinding[]): {
  plusHigh: CompiledJournalHabitFinding[];
  minusHigh: CompiledJournalHabitFinding[];
  plusMedium: CompiledJournalHabitFinding[];
  minusMedium: CompiledJournalHabitFinding[];
} {
  const plusHigh: CompiledJournalHabitFinding[] = [];
  const minusHigh: CompiledJournalHabitFinding[] = [];
  const plusMedium: CompiledJournalHabitFinding[] = [];
  const minusMedium: CompiledJournalHabitFinding[] = [];

  for (const finding of findings) {
    if (finding.confidence === 'high' && finding.polarity === 'plus') {
      plusHigh.push(finding);
    } else if (finding.confidence === 'high' && finding.polarity === 'minus') {
      minusHigh.push(finding);
    } else if (finding.polarity === 'plus') {
      plusMedium.push(finding);
    } else {
      minusMedium.push(finding);
    }
  }

  return { plusHigh, minusHigh, plusMedium, minusMedium };
}
