/**
 * Persist Science Sport analysis evidence after a deterministic snapshot build.
 * Used for A/B recalc replay — never LLM-authored.
 */

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { computePackTier, type PackTierResult } from '@/core/science/pack-tier';
import { buildPackInputsFromSnapshot } from '@/lib/science/reliability/pack-inputs-from-snapshot';
import { persistAnalysisEvidence } from '@/lib/science/reliability/analysis-evidence-store';
import { runAnalysisRecalcWithRollback } from '@/lib/science/reliability/analysis-evidence';
import {
  getLatestAthleteSnapshot,
  saveAthleteSnapshot,
} from '@/infrastructure/athlete-state/snapshot-repository';
import { canPersistAnalysisEvidence } from '@/lib/privacy/consent-withdraw-ux';

function packResultFromSnapshot(snapshot: AthleteSnapshot): PackTierResult {
  return computePackTier(buildPackInputsFromSnapshot(snapshot));
}

function rationaleCodesFromSnapshot(snapshot: AthleteSnapshot): string[] {
  return [
    snapshot.decision?.primaryDecision?.rationaleCode,
    snapshot.reasoning?.topAction?.rationaleCode,
  ].filter((c): c is string => Boolean(c));
}

async function writeEvidenceFromSnapshot(snapshot: AthleteSnapshot): Promise<void> {
  const packInput = buildPackInputsFromSnapshot(snapshot);
  const pack = computePackTier(packInput);

  await persistAnalysisEvidence({
    athleteId: snapshot.athleteId,
    trainingDayId: snapshot.trainingDayId,
    snapshotId: snapshot.snapshotId,
    inputs: {
      ...packInput,
      gaps: pack.gaps,
    },
    verdict: {
      overallVerdict: snapshot.todaysDecision ?? snapshot.decision?.overallVerdict ?? null,
      confidence: snapshot.confidence,
      confidenceTier: snapshot.decision?.confidenceTier ?? null,
      packTier: pack.packTier,
      rationaleCodes: rationaleCodesFromSnapshot(snapshot),
      allowsHardVerdict: pack.allowsHardVerdict,
    },
  });
}

export async function persistEvidenceFromSnapshot(snapshot: AthleteSnapshot): Promise<void> {
  const { athleteHasHealthDataConsent } = await import('@/lib/privacy/consent-store');
  if (!canPersistAnalysisEvidence(await athleteHasHealthDataConsent(snapshot.athleteId))) {
    return;
  }
  await writeEvidenceFromSnapshot(snapshot);
}

/**
 * Recalc path: capture prior snapshot as A, run builder for B, rollback DB on failure.
 */
export async function regenerateSnapshotWithEvidenceRollback(handlers: {
  athleteId: string;
  trainingDayId: string;
  buildB: () => Promise<AthleteSnapshot>;
}): Promise<
  | { ok: true; snapshot: AthleteSnapshot; previous: AthleteSnapshot | null }
  | { ok: false; snapshot: AthleteSnapshot | null; error: unknown }
> {
  const prior = await getLatestAthleteSnapshot({
    athleteId: handlers.athleteId,
    trainingDayId: handlers.trainingDayId,
  });

  if (!prior) {
    try {
      const snapshot = await handlers.buildB();
      await persistEvidenceFromSnapshot(snapshot);
      return { ok: true, snapshot, previous: null };
    } catch (error) {
      return { ok: false, snapshot: null, error };
    }
  }

  await persistEvidenceFromSnapshot(prior);

  const result = await runAnalysisRecalcWithRollback<AthleteSnapshot>({
    captureA: async () => prior,
    runB: handlers.buildB,
    restoreA: async (a) => {
      await saveAthleteSnapshot(a);
    },
  });

  if (!result.ok) {
    return { ok: false, snapshot: prior, error: result.error };
  }

  await persistEvidenceFromSnapshot(result.result);
  return { ok: true, snapshot: result.result, previous: result.previous };
}

// Keep packResultFromSnapshot available for tests / callers that need the tier only.
export { packResultFromSnapshot };
