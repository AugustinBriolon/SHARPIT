/**
 * Build PackInputSignals from AthleteSnapshot (best-effort V0).
 * Uses freshness domains + recovery dimensions; never invents certainty.
 */

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { PackInputSignals } from '@/core/science/pack-tier';
import { isHardVerdictRequiringFull } from '@/core/science/pack-tier';

function hoursSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) {
    return null;
  }
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return null;
  }
  return (now.getTime() - t) / 3_600_000;
}

function domainLastUpdated(
  snapshot: AthleteSnapshot,
  domain: string,
): string | null {
  return snapshot.freshness.domains.find((d) => d.domain === domain)?.lastUpdatedAt ?? null;
}

function countRecoveryDimensions(snapshot: AthleteSnapshot): number {
  const dims = snapshot.recovery?.dimensions;
  if (!dims) {
    return 0;
  }
  return [dims.autonomic, dims.sleep, dims.subjective, dims.loadContext].filter(
    (d) => d.available,
  ).length;
}

/**
 * Estimate HRV baseline days from readiness category + autonomic availability.
 * V0 heuristic until feature-level baseline length is persisted on the snapshot.
 */
export function estimateHrvBaselineDays(snapshot: AthleteSnapshot): number | null {
  const recovery = snapshot.recovery;
  if (!recovery) {
    return null;
  }
  if (recovery.readinessCategory === 'INSUFFICIENT_DATA') {
    return 0;
  }
  if (recovery.readinessCategory === 'BASELINE_PENDING') {
    return 3;
  }
  if (!recovery.dimensions.autonomic.available) {
    return null;
  }
  if (recovery.dataCompleteness === 'FULL') {
    return 14;
  }
  if (recovery.dataCompleteness === 'PARTIAL') {
    return 10;
  }
  if (recovery.dataCompleteness === 'SPARSE') {
    return 7;
  }
  return 7;
}

/**
 * Load coverage proxy: prefer explicit signal when present; otherwise infer from
 * loadContext availability + rest-day style hints on fatigue/daily strain.
 */
export function estimateLoadDaysCoveredIn7(snapshot: AthleteSnapshot): number | null {
  if (!snapshot.recovery?.dimensions.loadContext.available && !snapshot.dailyStrain) {
    return null;
  }
  // When load context is available with FULL twin completeness, assume ≥5/7.
  if (snapshot.recovery?.dataCompleteness === 'FULL') {
    return 6;
  }
  if (snapshot.recovery?.dimensions.loadContext.available) {
    return snapshot.recovery.dataCompleteness === 'PARTIAL' ? 5 : 4;
  }
  return 3;
}

export function buildPackInputsFromSnapshot(
  snapshot: AthleteSnapshot,
  options?: { now?: Date; intensityAdviceRequested?: boolean; hasSportContext?: boolean },
): PackInputSignals {
  const now = options?.now ?? new Date();
  const verdict = snapshot.todaysDecision ?? snapshot.decision?.overallVerdict ?? null;
  const intensityAdviceRequested =
    options?.intensityAdviceRequested ?? isHardVerdictRequiringFull(verdict);
  const hasSportContext =
    options?.hasSportContext ??
    Boolean(snapshot.plannedToday?.length || snapshot.sessionsDoneToday?.length);

  return {
    sleepNightAgeHours: hoursSince(domainLastUpdated(snapshot, 'sleep'), now),
    morningHrvAgeHours: hoursSince(domainLastUpdated(snapshot, 'recovery'), now),
    hrvBaselineDays: estimateHrvBaselineDays(snapshot),
    loadSyncAgeHours: hoursSince(domainLastUpdated(snapshot, 'training'), now),
    loadDaysCoveredIn7: estimateLoadDaysCoveredIn7(snapshot),
    recoveryDimensionCount: countRecoveryDimensions(snapshot),
    hasSportContext,
    intensityAdviceRequested,
  };
}
