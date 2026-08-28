import type { RawSessionObservation, SportType } from '@/core/observation/types';

/**
 * Maps a stored Activity row to a SESSION observation.
 *
 * The Garmin sync builds observations from the live API payload
 * (`src/core/adapters/garmin-activity-adapter.ts`), which only covers activities
 * seen while that path was running. This mapper rebuilds them from what is
 * already in the database, so the Core's feature pipeline can cover the whole
 * history rather than the fraction that happened to be ingested.
 *
 * Structural input by design: no Prisma import, so the function stays pure and
 * testable without a database.
 */

/** Prisma's ActivityType, restated structurally. */
export type StoredActivityType =
  'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' | 'TRIATHLON' | 'HIKE' | 'OTHER';

export interface StoredActivityForSession {
  id: string;
  type: StoredActivityType;
  date: Date;
  duration: number | null;
  garminId?: string | null;
  stravaId?: string | null;
  title?: string | null;
  runMetrics?: {
    avgHr: number | null;
    paceSecPerKm: number | null;
    distanceM: number | null;
    elevationM: number | null;
  } | null;
  bikeMetrics?: {
    avgPower: number | null;
    normalizedPower: number | null;
    elevationM: number | null;
    calories: number | null;
  } | null;
  swimMetrics?: { distanceM: number | null } | null;
  hikeMetrics?: {
    avgHr: number | null;
    distanceM: number | null;
    elevationM: number | null;
    calories: number | null;
  } | null;
}

export interface ActivityToSessionOptions {
  /**
   * Average HR recovered from the cached activity stream.
   *
   * BikeMetrics and SwimMetrics have no avgHr column, so without this those
   * sports can never reach the TRIMP tier even when the stream holds the data.
   */
  avgHrFromStream?: number | null;
  maxHrFromStream?: number | null;
  receivedAt?: Date;
}

/**
 * SportType has no HIKE member, so hiking maps to OTHER — whose 45 TSS/h factor
 * is the closest available to a sustained submaximal effort. Prisma has no
 * TRAIL_RUN or MTB, so that granularity cannot be recovered here.
 */
const SPORT_TYPE_BY_ACTIVITY_TYPE: Record<StoredActivityType, SportType> = {
  RUN: 'RUN',
  BIKE: 'BIKE',
  SWIM: 'SWIM',
  STRENGTH: 'STRENGTH',
  TRIATHLON: 'TRIATHLON',
  HIKE: 'OTHER',
  OTHER: 'OTHER',
};

function positive(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Source and dedup key, matching how the stream provider resolves an observation
 * back to its Activity (`findSessionWhere` in prisma-session-stream-provider).
 *
 * Getting this wrong has two consequences: the session cannot find its cached
 * stream, so stream-derived features stay null; and it fails to deduplicate
 * against the observation the manual sync already wrote for the same activity,
 * producing two sessions for one activity and double-counting the day's load.
 */
function resolveIdentity(activity: StoredActivityForSession): {
  source: RawSessionObservation['source'];
  externalId: string;
} {
  if (activity.garminId) {
    return { source: 'GARMIN', externalId: activity.garminId };
  }
  if (activity.stravaId) {
    return { source: 'STRAVA', externalId: activity.stravaId };
  }
  return { source: 'MANUAL', externalId: `manual:activity:${activity.id}` };
}

export function storedActivityToSession(
  activity: StoredActivityForSession,
  options?: ActivityToSessionOptions,
): RawSessionObservation | null {
  const durationSec = positive(activity.duration);
  if (!durationSec) {
    return null;
  }

  const sportType = SPORT_TYPE_BY_ACTIVITY_TYPE[activity.type];

  const avgWatts = positive(activity.bikeMetrics?.avgPower);
  const powerData: RawSessionObservation['powerData'] = avgWatts
    ? {
        avgWatts,
        normalizedPower: positive(activity.bikeMetrics?.normalizedPower),
        // Intensity factor is deliberately not carried over: Garmin derives it
        // from its own FTP, and the Core must compute it from ours.
        quality: sportType === 'BIKE' ? 'MEASURED_DIRECT' : 'MEASURED_OPTICAL',
      }
    : undefined;

  const avgBpm =
    positive(activity.runMetrics?.avgHr) ??
    positive(activity.hikeMetrics?.avgHr) ??
    positive(options?.avgHrFromStream);
  const hrData: RawSessionObservation['hrData'] = avgBpm
    ? {
        avgBpm: Math.round(avgBpm),
        maxBpm: positive(options?.maxHrFromStream)
          ? Math.round(options!.maxHrFromStream!)
          : undefined,
        // Provenance is not recorded per activity, and Garmin wrist HR is the
        // common case, so assume optical: it lowers confidence rather than
        // overstating it.
        quality: 'MEASURED_OPTICAL',
      }
    : undefined;

  const paceSecPerKm = positive(activity.runMetrics?.paceSecPerKm);
  const runDistanceM = positive(activity.runMetrics?.distanceM);
  // Only running pace is consumed by the Core's pace tier; swim pace uses a
  // different unit and would be a lie in this field.
  const paceData: RawSessionObservation['paceData'] =
    paceSecPerKm && runDistanceM
      ? { avgMinPerKm: paceSecPerKm / 60, distanceM: runDistanceM }
      : undefined;

  const { source, externalId } = resolveIdentity(activity);

  return {
    type: 'SESSION',
    source,
    timestamp: activity.date,
    receivedAt: options?.receivedAt ?? new Date(),
    sportType,
    durationSec,
    externalId,
    title: activity.title ?? undefined,
    powerData,
    hrData,
    paceData,
    elevationM:
      positive(activity.runMetrics?.elevationM) ??
      positive(activity.bikeMetrics?.elevationM) ??
      positive(activity.hikeMetrics?.elevationM),
    calories: positive(activity.bikeMetrics?.calories) ?? positive(activity.hikeMetrics?.calories),
    // sourceProvidedStress is deliberately omitted. Activity.load coalesces
    // Garmin's trainingStressScore with its EPOC-derived activityTrainingLoad,
    // which are different scales (~49 vs ~151 per hour on this athlete's data),
    // and bikeMetrics.tss is written from the same coalesced value. Carrying it
    // over would push that contamination into the Core, which computes its own
    // TSS anyway and only keeps this field for cross-validation.
  };
}
