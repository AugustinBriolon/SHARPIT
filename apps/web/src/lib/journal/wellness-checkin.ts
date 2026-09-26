import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';
import {
  parseMorningWellnessEntry,
  type MorningWellnessEntry,
} from '@/lib/journal/morning-wellness-entry';
import type { WellnessCheckinPayload } from '@/lib/validators/wellness-checkin';
import { onWellnessSubmitted } from '@/lib/athlete-state/orchestrator';
import { trainingDayIdForNow } from '@sharpit/core/training/training-day';

export type { MorningWellnessEntry };

async function listMorningSubjectiveRows(athleteId: string, trainingDayId: string) {
  return prisma.observation.findMany({
    where: {
      athleteId,
      trainingDayId,
      type: 'SUBJECTIVE',
      source: 'MANUAL',
    },
    orderBy: { timestamp: 'desc' },
    select: { data: true },
  });
}

function isNonSessionSubjective(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  return !(
    'sessionExternalId' in data && (data as { sessionExternalId?: unknown }).sessionExternalId
  );
}

/** Latest morning (non-session) SUBJECTIVE MANUAL entry with full scales, if any. */
export async function getMorningWellnessCheckin(
  athleteId: string,
  trainingDayId: string,
): Promise<MorningWellnessEntry | null> {
  const rows = await listMorningSubjectiveRows(athleteId, trainingDayId);

  for (const row of rows) {
    const entry = parseMorningWellnessEntry(row.data);
    if (entry) {
      return entry;
    }
  }

  return null;
}

export async function hasMorningWellnessCheckin(
  athleteId: string,
  trainingDayId: string,
): Promise<boolean> {
  const rows = await listMorningSubjectiveRows(athleteId, trainingDayId);
  return rows.some((row) => isNonSessionSubjective(row.data));
}

export async function submitMorningWellnessCheckin(
  athleteId: string,
  trainingDayId: string,
  payload: WellnessCheckinPayload,
): Promise<{ alreadyCompleted: boolean }> {
  if (await hasMorningWellnessCheckin(athleteId, trainingDayId)) {
    return { alreadyCompleted: true };
  }

  const now = new Date();
  const result = await observationEngine.ingest(athleteId, {
    type: 'SUBJECTIVE',
    source: 'MANUAL',
    timestamp: now,
    receivedAt: now,
    mood: payload.mood,
    energyLevel: payload.energyLevel,
    perceivedSoreness: payload.perceivedSoreness,
    stressLevel: payload.stressLevel,
    notes: payload.notes ?? undefined,
  });

  if (result.status === 'REJECTED') {
    throw new Error(`Observation rejetée (${result.reason.code})`);
  }

  await onWellnessSubmitted(athleteId, trainingDayId);

  // Best-effort: evaluate morning session recalibration after Twin refresh.
  try {
    const { ensureMorningRecalibration } = await import('@/lib/morning-recalibration/service');
    await ensureMorningRecalibration(athleteId, trainingDayId);
  } catch (error) {
    console.error('[wellness-checkin/morning-recalibration]', error);
  }

  return { alreadyCompleted: false };
}

export function todayTrainingDayId(date = new Date()): string {
  return trainingDayIdForNow({}, date);
}
