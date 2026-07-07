import { format } from 'date-fns';
import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';
import type { WellnessCheckinPayload } from '@/lib/validators/wellness-checkin';
import { onWellnessSubmitted } from '@/lib/athlete-state/orchestrator';

const ATHLETE_ID = 'default';

export async function hasMorningWellnessCheckin(
  athleteId: string,
  trainingDayId: string,
): Promise<boolean> {
  const rows = await prisma.observation.findMany({
    where: {
      athleteId,
      trainingDayId,
      type: 'SUBJECTIVE',
      source: 'MANUAL',
    },
    select: { data: true },
  });

  return rows.some((row) => {
    const data = row.data as Record<string, unknown>;
    return !data.sessionExternalId;
  });
}

export async function submitMorningWellnessCheckin(
  trainingDayId: string,
  payload: WellnessCheckinPayload,
): Promise<{ alreadyCompleted: boolean }> {
  const athleteId = ATHLETE_ID;

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
  });

  if (result.status === 'REJECTED') {
    throw new Error(`Observation rejetée (${result.reason.code})`);
  }

  await onWellnessSubmitted(trainingDayId);

  return { alreadyCompleted: false };
}

export function todayTrainingDayId(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
