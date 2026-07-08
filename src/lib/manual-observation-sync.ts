import type {
  BodySide as PrismaBodySide,
  PhysicalCategory as PrismaPhysicalCategory,
} from '@prisma/client';
import type { getActivityById, getPhysicalNoteById } from '@/lib/queries';
import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';
import type {
  RawPhysicalConditionObservation,
  RawSessionObservation,
  RawSubjectiveObservation,
  SessionHrData,
  SessionPaceData,
  SessionPowerData,
  SportType,
} from '@/core/observation';

const ATHLETE_ID = 'default';

function manualActivityExternalId(activityId: string): string {
  return `manual:activity:${activityId}`;
}

function manualConditionExternalId(noteId: string): string {
  return `manual:condition:${noteId}`;
}

function mapActivityTypeToSport(type: string): SportType {
  switch (type) {
    case 'RUN':
      return 'RUN';
    case 'BIKE':
      return 'BIKE';
    case 'SWIM':
      return 'SWIM';
    case 'STRENGTH':
      return 'STRENGTH';
    case 'TRIATHLON':
      return 'TRIATHLON';
    default:
      return 'OTHER';
  }
}

function mapFeelingToMood(feeling: string | null | undefined): number | undefined {
  if (!feeling) return undefined;
  const moodMap: Record<string, number> = {
    'Très mal': 1,
    Mal: 2,
    Correct: 3,
    Bien: 4,
    'Très bien': 5,
  };

  return moodMap[feeling] ?? undefined;
}

function buildPowerData(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): SessionPowerData | undefined {
  if (activity.type === 'BIKE' || activity.type === 'TRIATHLON') {
    const avgPower = activity.bikeMetrics?.avgPower ?? null;
    if (avgPower && avgPower > 0) {
      return {
        avgWatts: avgPower,
        normalizedPower: activity.bikeMetrics?.normalizedPower ?? undefined,
        intensityFactor: activity.bikeMetrics?.intensityFactor ?? undefined,
        quality: 'MEASURED_DIRECT',
      };
    }
  }

  if (activity.type === 'RUN') {
    const avgPower = activity.runMetrics?.avgPower ?? null;
    if (avgPower && avgPower > 0) {
      return {
        avgWatts: avgPower,
        quality: 'MEASURED_OPTICAL',
      };
    }
  }

  return undefined;
}

function buildHrData(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): SessionHrData | undefined {
  const avgHr = activity.runMetrics?.avgHr ?? null;

  if (avgHr && avgHr > 0) {
    return {
      avgBpm: avgHr,
      quality: 'MEASURED_OPTICAL',
    };
  }

  return undefined;
}

function buildPaceData(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): SessionPaceData | undefined {
  if (activity.type === 'RUN') {
    const distanceM = activity.runMetrics?.distanceM ?? null;
    const paceSecPerKm = activity.runMetrics?.paceSecPerKm ?? null;
    if (distanceM && distanceM > 0 && paceSecPerKm && paceSecPerKm > 0) {
      return {
        avgMinPerKm: paceSecPerKm / 60,
        distanceM,
      };
    }
  }

  if (activity.type === 'SWIM') {
    const distanceM = activity.swimMetrics?.distanceM ?? null;
    const avgPaceSecPer100m = activity.swimMetrics?.avgPaceSecPer100m ?? null;
    if (distanceM && distanceM > 0 && avgPaceSecPer100m && avgPaceSecPer100m > 0) {
      return {
        avgMinPerKm: avgPaceSecPer100m / 10 / 60,
        distanceM,
      };
    }
  }

  return undefined;
}

function buildManualSessionObservation(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): RawSessionObservation | null {
  if (!activity.duration || activity.duration <= 0) return null;

  const powerData = buildPowerData(activity);
  const hrData = buildHrData(activity);
  const paceData = buildPaceData(activity);

  const elevationM =
    activity.runMetrics?.elevationM ?? activity.bikeMetrics?.elevationM ?? undefined;

  const calories = activity.bikeMetrics?.calories ?? undefined;
  const sourceProvidedStress =
    activity.load != null && activity.load > 0
      ? {
          value: activity.load,
          quality: 'ESTIMATED' as const,
        }
      : undefined;

  return {
    type: 'SESSION',
    source: 'MANUAL',
    timestamp: activity.date,
    receivedAt: new Date(),
    sportType: mapActivityTypeToSport(activity.type),
    durationSec: activity.duration,
    externalId: manualActivityExternalId(activity.id),
    title: activity.title ?? undefined,
    notes: activity.notes ?? undefined,
    powerData,
    hrData,
    paceData,
    elevationM,
    calories,
    sourceProvidedStress,
  };
}

function buildManualSubjectiveObservation(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): RawSubjectiveObservation | null {
  const mood = mapFeelingToMood(activity.feeling);
  if (activity.rpe == null && mood == null) return null;

  return {
    type: 'SUBJECTIVE',
    source: 'MANUAL',
    timestamp: activity.date,
    receivedAt: new Date(),
    rpe: activity.rpe ?? undefined,
    mood,
    sessionExternalId: manualActivityExternalId(activity.id),
    notes: activity.notes ?? undefined,
  };
}

async function deleteManualSubjectiveObservations(sessionExternalId: string): Promise<void> {
  const rows = await prisma.observation.findMany({
    where: {
      athleteId: ATHLETE_ID,
      type: 'SUBJECTIVE',
      source: 'MANUAL',
    },
    select: { id: true, data: true },
  });

  const ids = rows
    .filter((row) => {
      const data = row.data as Record<string, unknown>;
      return data.sessionExternalId === sessionExternalId;
    })
    .map((row) => row.id);

  if (ids.length > 0) {
    await prisma.observation.deleteMany({ where: { id: { in: ids } } });
  }
}

export async function removeManualActivityObservations(activityId: string): Promise<void> {
  const externalId = manualActivityExternalId(activityId);

  await prisma.observation.deleteMany({
    where: {
      athleteId: ATHLETE_ID,
      type: 'SESSION',
      externalId,
    },
  });

  await deleteManualSubjectiveObservations(externalId);
}

export async function syncManualActivityObservations(
  activity: NonNullable<Awaited<ReturnType<typeof getActivityById>>>,
): Promise<void> {
  await removeManualActivityObservations(activity.id);

  const rawSession = buildManualSessionObservation(activity);
  if (!rawSession) return;

  await observationEngine.ingest(ATHLETE_ID, rawSession);

  const rawSubjective = buildManualSubjectiveObservation(activity);
  if (rawSubjective) {
    await observationEngine.ingest(ATHLETE_ID, rawSubjective);
  }
}

function mapPhysicalCategory(
  category: PrismaPhysicalCategory,
): RawPhysicalConditionObservation['category'] {
  return category;
}

function mapBodySide(
  side: PrismaBodySide | null | undefined,
): RawPhysicalConditionObservation['bodySide'] {
  return side ?? 'NA';
}

function buildPhysicalConditionObservation(
  note: NonNullable<Awaited<ReturnType<typeof getPhysicalNoteById>>>,
): RawPhysicalConditionObservation {
  const latestCheckin = note.checkins[0] ?? null;
  const severity = note.status === 'RESOLVED' ? 0 : (latestCheckin?.severity ?? note.severity ?? 0);
  const affectsTraining = note.status === 'RESOLVED' ? false : note.affectsTraining;

  return {
    type: 'PHYSICAL_CONDITION',
    source: 'MANUAL',
    timestamp: latestCheckin?.date ?? note.resolvedAt ?? note.startDate ?? note.updatedAt,
    receivedAt: new Date(),
    category: mapPhysicalCategory(note.category),
    bodyRegion: note.bodyPart ?? note.title,
    bodySide: mapBodySide(note.side),
    severity,
    description: latestCheckin?.comment ?? note.description ?? note.title,
    conditionId: manualConditionExternalId(note.id),
    affectsTraining,
  };
}

export async function removePhysicalConditionObservations(noteId: string): Promise<void> {
  const conditionId = manualConditionExternalId(noteId);
  const rows = await prisma.observation.findMany({
    where: {
      athleteId: ATHLETE_ID,
      type: 'PHYSICAL_CONDITION',
      source: 'MANUAL',
    },
    select: { id: true, data: true },
  });

  const ids = rows
    .filter((row) => {
      const data = row.data as Record<string, unknown>;
      return data.conditionId === conditionId;
    })
    .map((row) => row.id);

  if (ids.length > 0) {
    await prisma.observation.deleteMany({ where: { id: { in: ids } } });
  }
}

export async function syncPhysicalConditionObservation(
  note: NonNullable<Awaited<ReturnType<typeof getPhysicalNoteById>>>,
): Promise<void> {
  await removePhysicalConditionObservations(note.id);
  await observationEngine.ingest(ATHLETE_ID, buildPhysicalConditionObservation(note));
}
