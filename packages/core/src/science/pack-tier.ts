/**
 * Science Sport — packTier V0 (deterministic reliability grille).
 *
 * Sole machine contract for soft-hero / hard-verdict gating.
 * LLM must never invent or override this tier.
 *
 * @see docs/science/reliability-grid-v0.md
 */

export const PACK_TIERS = ['FULL', 'PARTIAL', 'LOW', 'INSUFFICIENT'] as const;
export type PackTier = (typeof PACK_TIERS)[number];

/** Freshness / coverage thresholds from the Science grille V0. */
export const PACK_TIER_THRESHOLDS = {
  sleepMaxAgeHours: 18,
  morningHrvMaxAgeHours: 12,
  hrvBaselineFullDays: 14,
  hrvBaselineMinDays: 7,
  loadSyncMaxAgeHours: 48,
  loadMinDaysCoveredIn7: 5,
  loadWindowDays: 7,
  minRecoveryDimensions: 2,
} as const;

/**
 * Hard product verdicts that require pack FULL.
 * Assertive TRAIN_SMART is gated the same way (Science grille §4).
 */
export const HARD_VERDICTS_REQUIRING_FULL = ['TRAIN_HARD', 'RACE_READY', 'TRAIN_SMART'] as const;

export type HardVerdictRequiringFull = (typeof HARD_VERDICTS_REQUIRING_FULL)[number];

export type PackInputSignals = {
  /** Hours since sleep night J observation. null = missing. */
  readonly sleepNightAgeHours: number | null;
  /** Hours since morning HRV observation. null = missing. */
  readonly morningHrvAgeHours: number | null;
  /** Days of HRV baseline history. null = unknown / missing. */
  readonly hrvBaselineDays: number | null;
  /** Hours since last load-related sync. null = missing. */
  readonly loadSyncAgeHours: number | null;
  /** Days with load coverage in the last 7 (0–7). null = unknown. */
  readonly loadDaysCoveredIn7: number | null;
  /** Available recovery dimensions (autonomic / sleep / subjective / loadContext). */
  readonly recoveryDimensionCount: number;
  /** Sport context present when intensity advice is requested. */
  readonly hasSportContext: boolean;
  /** True when the product path would emit intensity topAction. */
  readonly intensityAdviceRequested: boolean;
};

export type PackGapCode =
  | 'SLEEP_MISSING'
  | 'SLEEP_STALE'
  | 'HRV_MISSING'
  | 'HRV_STALE'
  | 'BASELINE_MISSING'
  | 'BASELINE_SHORT'
  | 'BASELINE_PARTIAL'
  | 'LOAD_MISSING'
  | 'LOAD_STALE'
  | 'LOAD_SPARSE'
  | 'SPORT_CONTEXT_MISSING'
  | 'RECOVERY_DIMENSIONS_LOW';

export type PackTierResult = {
  readonly packTier: PackTier;
  readonly gaps: readonly PackGapCode[];
  /** True when hard verdicts (TRAIN_HARD / RACE_READY / assertive TRAIN_SMART) are allowed. */
  readonly allowsHardVerdict: boolean;
  /** True when intensity topAction must be withheld. */
  readonly withholdIntensityTopAction: boolean;
};

function isFresh(ageHours: number | null, maxHours: number): boolean {
  return ageHours !== null && ageHours <= maxHours;
}

function collectGaps(input: PackInputSignals): PackGapCode[] {
  const gaps: PackGapCode[] = [];
  const t = PACK_TIER_THRESHOLDS;

  if (input.sleepNightAgeHours === null) {
    gaps.push('SLEEP_MISSING');
  } else if (input.sleepNightAgeHours > t.sleepMaxAgeHours) {
    gaps.push('SLEEP_STALE');
  }

  if (input.morningHrvAgeHours === null) {
    gaps.push('HRV_MISSING');
  } else if (input.morningHrvAgeHours > t.morningHrvMaxAgeHours) {
    gaps.push('HRV_STALE');
  }

  if (input.hrvBaselineDays === null) {
    gaps.push('BASELINE_MISSING');
  } else if (input.hrvBaselineDays < t.hrvBaselineMinDays) {
    gaps.push('BASELINE_SHORT');
  } else if (input.hrvBaselineDays < t.hrvBaselineFullDays) {
    gaps.push('BASELINE_PARTIAL');
  }

  if (input.loadSyncAgeHours === null || input.loadDaysCoveredIn7 === null) {
    gaps.push('LOAD_MISSING');
  } else {
    if (input.loadSyncAgeHours > t.loadSyncMaxAgeHours) {
      gaps.push('LOAD_STALE');
    }
    if (input.loadDaysCoveredIn7 < t.loadMinDaysCoveredIn7) {
      gaps.push('LOAD_SPARSE');
    }
  }

  if (input.recoveryDimensionCount < t.minRecoveryDimensions) {
    gaps.push('RECOVERY_DIMENSIONS_LOW');
  }

  if (input.intensityAdviceRequested && !input.hasSportContext) {
    gaps.push('SPORT_CONTEXT_MISSING');
  }

  return gaps;
}

function isInsufficient(input: PackInputSignals): boolean {
  const t = PACK_TIER_THRESHOLDS;
  if (input.recoveryDimensionCount < t.minRecoveryDimensions) {
    return true;
  }
  if (input.hrvBaselineDays === null || input.hrvBaselineDays < t.hrvBaselineMinDays) {
    return true;
  }
  return false;
}

function isFull(input: PackInputSignals, gaps: readonly PackGapCode[]): boolean {
  if (gaps.length > 0) {
    return false;
  }
  // Explicit FULL checklist (mirrors Science grille §2).
  return (
    isFresh(input.sleepNightAgeHours, PACK_TIER_THRESHOLDS.sleepMaxAgeHours) &&
    isFresh(input.morningHrvAgeHours, PACK_TIER_THRESHOLDS.morningHrvMaxAgeHours) &&
    (input.hrvBaselineDays ?? 0) >= PACK_TIER_THRESHOLDS.hrvBaselineFullDays &&
    isFresh(input.loadSyncAgeHours, PACK_TIER_THRESHOLDS.loadSyncMaxAgeHours) &&
    (input.loadDaysCoveredIn7 ?? 0) >= PACK_TIER_THRESHOLDS.loadMinDaysCoveredIn7 &&
    (!input.intensityAdviceRequested || input.hasSportContext) &&
    input.recoveryDimensionCount >= PACK_TIER_THRESHOLDS.minRecoveryDimensions
  );
}

/**
 * PARTIAL vs LOW: both are soft-hero tiers.
 * PARTIAL = usable soft advice (sleep or HRV reasonably present, load not totally missing).
 * LOW = thin coverage remaining after INSUFFICIENT filter.
 */
function resolvePartialOrLow(gaps: readonly PackGapCode[]): PackTier {
  const severe = new Set<PackGapCode>([
    'SLEEP_MISSING',
    'HRV_MISSING',
    'LOAD_MISSING',
    'LOAD_SPARSE',
    'SPORT_CONTEXT_MISSING',
  ]);
  const severeCount = gaps.filter((g) => severe.has(g)).length;
  if (severeCount >= 2) {
    return 'LOW';
  }
  return 'PARTIAL';
}

export function computePackTier(input: PackInputSignals): PackTierResult {
  const gaps = collectGaps(input);

  if (isInsufficient(input)) {
    return {
      packTier: 'INSUFFICIENT',
      gaps,
      allowsHardVerdict: false,
      withholdIntensityTopAction: true,
    };
  }

  if (isFull(input, gaps)) {
    return {
      packTier: 'FULL',
      gaps: [],
      allowsHardVerdict: true,
      withholdIntensityTopAction: false,
    };
  }

  const packTier = resolvePartialOrLow(gaps);
  return {
    packTier,
    gaps,
    allowsHardVerdict: false,
    withholdIntensityTopAction: false,
  };
}

export function isHardVerdictRequiringFull(verdict: string | null | undefined): boolean {
  if (!verdict) {
    return false;
  }
  return (HARD_VERDICTS_REQUIRING_FULL as readonly string[]).includes(verdict);
}
