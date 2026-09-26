/**
 * Prisma-backed store for Science Sport analysis evidence (A/B recalc).
 * Athlete-isolated. Cascade on AthleteProfile delete; explicit purge on soft-delete
 * and health / AI consent withdraw.
 *
 * Retention LOCKED: ANALYSIS_EVIDENCE_RETENTION (N=5 OR 14 days, whichever shorter).
 */

import { prisma } from '@sharpit/db/client';
import {
  ANALYSIS_EVIDENCE_RETENTION,
  selectEvidenceRowsToKeep,
  type AnalysisEvidenceInputSnapshot,
  type AnalysisEvidenceRecord,
  type AnalysisEvidenceVerdictSnapshot,
} from '@sharpit/server/lib/science/reliability/analysis-evidence';

function mapRow(row: {
  id: string;
  athleteId: string;
  trainingDayId: string;
  snapshotId: string | null;
  inputs: unknown;
  verdict: unknown;
  createdAt: Date;
}): AnalysisEvidenceRecord {
  return {
    id: row.id,
    athleteId: row.athleteId,
    trainingDayId: row.trainingDayId,
    snapshotId: row.snapshotId,
    inputs: row.inputs as AnalysisEvidenceInputSnapshot,
    verdict: row.verdict as AnalysisEvidenceVerdictSnapshot,
    createdAt: row.createdAt,
  };
}

export async function persistAnalysisEvidence(input: {
  athleteId: string;
  trainingDayId: string;
  snapshotId: string | null;
  inputs: AnalysisEvidenceInputSnapshot;
  verdict: AnalysisEvidenceVerdictSnapshot;
}): Promise<AnalysisEvidenceRecord> {
  const created = await prisma.analysisEvidenceSnapshot.create({
    data: {
      athleteId: input.athleteId,
      trainingDayId: input.trainingDayId,
      snapshotId: input.snapshotId,
      inputs: input.inputs,
      verdict: input.verdict,
    },
  });
  await enforceAnalysisEvidenceRetention(input.athleteId);
  return mapRow(created);
}

export async function listAnalysisEvidenceForAthlete(
  athleteId: string,
  take = ANALYSIS_EVIDENCE_RETENTION.maxRowsPerAthlete,
): Promise<AnalysisEvidenceRecord[]> {
  const rows = await prisma.analysisEvidenceSnapshot.findMany({
    where: { athleteId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map(mapRow);
}

/**
 * Rows visible for GDPR export (art. 15/20): same retention window as live store.
 * No secrets in this table — inputs/verdict are deterministic pack signals only.
 */
export async function listAnalysisEvidenceForExport(
  athleteId: string,
  now: Date = new Date(),
): Promise<AnalysisEvidenceRecord[]> {
  const rows = await prisma.analysisEvidenceSnapshot.findMany({
    where: { athleteId },
    orderBy: { createdAt: 'desc' },
    // Fetch slightly past the row cap so age filtering can drop stale rows first.
    take: ANALYSIS_EVIDENCE_RETENTION.maxRowsPerAthlete + 20,
  });
  const { keep } = selectEvidenceRowsToKeep(rows.map(mapRow), now);
  return keep;
}

export async function latestAnalysisEvidencePair(
  athleteId: string,
  trainingDayId: string,
): Promise<{ a: AnalysisEvidenceRecord; b: AnalysisEvidenceRecord } | null> {
  const rows = await prisma.analysisEvidenceSnapshot.findMany({
    where: { athleteId, trainingDayId },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  if (rows.length < 2) {
    return null;
  }
  return { b: mapRow(rows[0]!), a: mapRow(rows[1]!) };
}

export async function enforceAnalysisEvidenceRetention(athleteId: string): Promise<number> {
  const rows = await prisma.analysisEvidenceSnapshot.findMany({
    where: { athleteId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  });
  const { purge } = selectEvidenceRowsToKeep(rows);
  if (purge.length === 0) {
    return 0;
  }
  const result = await prisma.analysisEvidenceSnapshot.deleteMany({
    where: { id: { in: purge.map((r) => r.id) } },
  });
  return result.count;
}

/** Purge all evidence for an athlete (consent withdraw / soft-delete hook). */
export async function purgeAnalysisEvidenceForAthlete(athleteId: string): Promise<number> {
  const result = await prisma.analysisEvidenceSnapshot.deleteMany({ where: { athleteId } });
  return result.count;
}
