import { ActivityType } from '@prisma/client';
import { NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS } from '@/core/inference/adaptation/constants';
import { prisma } from '@/lib/prisma';
import { fetchAndCacheActivityStreams } from '@/lib/streams/streams';
import { addTrainingDays, approximateTrainingDayUtcRange } from '@/lib/training/training-day';

/** Outdoor endurance sports that can produce HR decoupling. */
const NME_STREAM_TYPES: ActivityType[] = [ActivityType.RUN, ActivityType.BIKE];

const MIN_DURATION_SEC = 30 * 60;
/** Cap per background pass to avoid Garmin/Strava rate limits. */
const MAX_FETCH_PER_PASS = 6;

export type EnsureNmeStreamsResult = {
  fetched: number;
  withData: number;
  candidateCount: number;
};

/**
 * Ensure GPS/HR streams exist for recent outdoor sessions that can feed
 * `hrDriftPercent` → neuromuscular efficiency — without opening the activity UI.
 */
export async function ensureStreamsForNeuromuscularEfficiency(
  athleteId: string,
  input: {
    activityIds?: string[];
    trainingDayId: string;
  },
): Promise<EnsureNmeStreamsResult> {
  const fromDayId = addTrainingDays(
    input.trainingDayId,
    -(NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS - 1),
  );
  const { gte } = approximateTrainingDayUtcRange(fromDayId);
  const syncedIds = (input.activityIds ?? []).filter(Boolean);

  const candidates = await prisma.activity.findMany({
    where: {
      athleteId,
      type: { in: NME_STREAM_TYPES },
      duration: { gte: MIN_DURATION_SEC },
      stream: null,
      OR: [{ garminId: { not: null } }, { stravaId: { not: null } }],
      AND: [
        {
          OR: [...(syncedIds.length > 0 ? [{ id: { in: syncedIds } }] : []), { date: { gte } }],
        },
      ],
    },
    orderBy: { date: 'desc' },
    take: MAX_FETCH_PER_PASS,
    select: {
      id: true,
      garminId: true,
      stravaId: true,
    },
  });

  const result: EnsureNmeStreamsResult = {
    fetched: 0,
    withData: 0,
    candidateCount: candidates.length,
  };

  for (const activity of candidates) {
    if (!activity.garminId && !activity.stravaId) {
      continue;
    }

    try {
      const { available } = await fetchAndCacheActivityStreams(athleteId, activity.id, {
        garminId: activity.garminId,
        stravaId: activity.stravaId,
      });
      result.fetched += 1;
      if (available) {
        result.withData += 1;
      }
    } catch (error) {
      console.error('[nme-streams]', activity.id, error);
      break;
    }
  }

  return result;
}

/**
 * Re-run Adaptation when:
 * - the Twin AdaptationState is for a previous training day and streamed sessions exist, or
 * - SESSION features already have hrDrift in the 14-day window but NME is still empty
 *   (heals the old "today-only sessions" bug without looping when drift is genuinely absent).
 */
type AdaptationTwinState = {
  dimensions?: {
    neuromuscularEfficiency?: { available?: boolean };
  };
  trainingDayId?: string;
} | null;

function readAdaptationTwinState(twin: { adaptationState: unknown } | null): AdaptationTwinState {
  return twin?.adaptationState as AdaptationTwinState;
}

function neuromuscularEfficiencyAvailable(adaptation: AdaptationTwinState): boolean {
  return adaptation?.dimensions?.neuromuscularEfficiency?.available === true;
}

async function sessionFeaturesHaveHrDrift(
  athleteId: string,
  fromDayId: string,
  trainingDayId: string,
): Promise<boolean> {
  const sessionFeatures = await prisma.featureSet.findMany({
    where: {
      athleteId,
      category: 'SESSION',
      status: 'COMPUTED',
      trainingDayId: { gte: fromDayId, lte: trainingDayId },
    },
    select: { data: true },
    take: 60,
  });

  return sessionFeatures.some((record) => {
    const data = record.data as { hrDriftPercent?: number | null } | null;
    return (data?.hrDriftPercent !== undefined && data?.hrDriftPercent !== null) && Number.isFinite(data.hrDriftPercent);
  });
}

async function hasStreamedEligibleActivities(
  athleteId: string,
  fromDayId: string,
): Promise<boolean> {
  const { gte } = approximateTrainingDayUtcRange(fromDayId);
  const streamedEligible = await prisma.activity.count({
    where: {
      athleteId,
      type: { in: NME_STREAM_TYPES },
      duration: { gte: MIN_DURATION_SEC },
      date: { gte },
      stream: { available: true },
    },
  });
  return streamedEligible > 0;
}

function shouldRecomputeFromHrDrift(
  nmeAvailable: boolean,
  adaptation: AdaptationTwinState,
  trainingDayId: string,
): boolean {
  return !nmeAvailable || adaptation?.trainingDayId !== trainingDayId;
}

export async function shouldRecomputeNeuromuscularAdaptation(
  athleteId: string,
  trainingDayId: string,
): Promise<boolean> {
  const twin = await prisma.digitalTwin.findUnique({
    where: { athleteId },
    select: { adaptationState: true },
  });

  const adaptation = readAdaptationTwinState(twin);
  const nmeAvailable = neuromuscularEfficiencyAvailable(adaptation);
  if (nmeAvailable && adaptation?.trainingDayId === trainingDayId) {
    return false;
  }

  const fromDayId = addTrainingDays(trainingDayId, -(NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS - 1));
  const hasHrDrift = await sessionFeaturesHaveHrDrift(athleteId, fromDayId, trainingDayId);
  if (hasHrDrift) {
    return shouldRecomputeFromHrDrift(nmeAvailable, adaptation, trainingDayId);
  }

  if (adaptation?.trainingDayId === trainingDayId) {
    return false;
  }

  return hasStreamedEligibleActivities(athleteId, fromDayId);
}
