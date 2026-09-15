/**
 * Analysis evidence A/B for Science Sport reliability V0.
 *
 * Persist athlete-isolated snapshots of deterministic inputs + verdict.
 * Recalc: A → B; fail B → rollback A.
 *
 * Retention LOCKED (Privacy + Secu): last N=5 OR 14 days (whichever shorter).
 * Purge on soft-delete / health or AI consent withdraw.
 * Athlete isolation via athleteId + AthleteProfile cascade.
 * LLM phrasing remains behind the AI hard gate only — evidence itself is deterministic.
 *
 * @see docs/science/reliability-grid-v0.md
 */

/** Privacy + Secu locked TTL for analysis evidence (whichever shorter wins). */
export const ANALYSIS_EVIDENCE_RETENTION = {
  /** Keep at most this many evidence rows per athlete. */
  maxRowsPerAthlete: 5,
  /** Drop rows older than this many days. */
  maxAgeDays: 14,
} as const;

export type AnalysisEvidenceVerdictSnapshot = {
  readonly overallVerdict: string | null;
  readonly confidence: number | null;
  readonly confidenceTier: string | null;
  readonly packTier: string;
  readonly rationaleCodes: readonly string[];
  readonly allowsHardVerdict: boolean;
};

export type AnalysisEvidenceInputSnapshot = {
  readonly sleepNightAgeHours: number | null;
  readonly morningHrvAgeHours: number | null;
  readonly hrvBaselineDays: number | null;
  readonly loadSyncAgeHours: number | null;
  readonly loadDaysCoveredIn7: number | null;
  readonly recoveryDimensionCount: number;
  readonly hasSportContext: boolean;
  readonly intensityAdviceRequested: boolean;
  readonly gaps: readonly string[];
};

export type AnalysisEvidenceRecord = {
  readonly id: string;
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly snapshotId: string | null;
  readonly inputs: AnalysisEvidenceInputSnapshot;
  readonly verdict: AnalysisEvidenceVerdictSnapshot;
  readonly createdAt: Date;
};

export type AnalysisEvidenceDiffLine = {
  readonly field: string;
  readonly from: string;
  readonly to: string;
};

/** Pure A/B diff for optional « Voir ce qui a changé ». */
export function diffAnalysisEvidence(
  a: AnalysisEvidenceRecord,
  b: AnalysisEvidenceRecord,
): AnalysisEvidenceDiffLine[] {
  const lines: AnalysisEvidenceDiffLine[] = [];

  if (a.verdict.overallVerdict !== b.verdict.overallVerdict) {
    lines.push({
      field: 'Verdict',
      from: a.verdict.overallVerdict ?? '-',
      to: b.verdict.overallVerdict ?? '-',
    });
  }
  if (a.verdict.packTier !== b.verdict.packTier) {
    lines.push({
      field: 'Fiabilité pack',
      from: a.verdict.packTier,
      to: b.verdict.packTier,
    });
  }
  if (a.verdict.confidenceTier !== b.verdict.confidenceTier) {
    lines.push({
      field: 'Confiance',
      from: a.verdict.confidenceTier ?? '-',
      to: b.verdict.confidenceTier ?? '-',
    });
  }

  const aGaps = a.inputs.gaps.join(', ') || 'aucun';
  const bGaps = b.inputs.gaps.join(', ') || 'aucun';
  if (aGaps !== bGaps) {
    lines.push({ field: 'Gaps', from: aGaps, to: bGaps });
  }

  return lines;
}

/** Retention cutoff: keep rows within maxAgeDays and maxRowsPerAthlete (whichever shorter). */
export function selectEvidenceRowsToKeep<T extends { createdAt: Date }>(
  rowsNewestFirst: readonly T[],
  now: Date = new Date(),
  retention = ANALYSIS_EVIDENCE_RETENTION,
): { keep: T[]; purge: T[] } {
  const maxAgeMs = retention.maxAgeDays * 24 * 60 * 60 * 1000;
  const keep: T[] = [];
  const purge: T[] = [];

  for (const row of rowsNewestFirst) {
    const ageOk = now.getTime() - row.createdAt.getTime() <= maxAgeMs;
    if (ageOk && keep.length < retention.maxRowsPerAthlete) {
      keep.push(row);
    } else {
      purge.push(row);
    }
  }
  return { keep, purge };
}

/**
 * Recalc transaction helper: capture A, run B, rollback on failure.
 * Pure orchestration — storage is injected.
 */
export async function runAnalysisRecalcWithRollback<T>(handlers: {
  captureA: () => Promise<T>;
  runB: () => Promise<T>;
  restoreA: (a: T) => Promise<void>;
}): Promise<{ ok: true; result: T; previous: T } | { ok: false; previous: T; error: unknown }> {
  const previous = await handlers.captureA();
  try {
    const result = await handlers.runB();
    return { ok: true, result, previous };
  } catch (error) {
    await handlers.restoreA(previous);
    return { ok: false, previous, error };
  }
}
