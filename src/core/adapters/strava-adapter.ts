/**
 * ADAPTER — Strava Activity → RawSessionObservation
 *
 * Pure functions. No I/O. No side effects.
 *
 * Strava data is secondary to Garmin in SHARPIT:
 *   - If a Garmin record exists for the same session, the Strava record is ignored
 *     (deduplication by the engine's externalId check handles this case implicitly
 *     since each platform has its own externalId)
 *   - Strava does not provide TSS directly (suffer_score is proprietary)
 *   - Strava does not indicate whether HR is chest strap or optical
 *
 * NOTE: Strava activities do NOT produce SubjectiveObservations — Strava's
 * "perceived exertion" field (if available) is not exposed in the API we use.
 */

import type { StravaActivity } from '@/lib/integrations/strava';

import type {
  RawSessionObservation,
  SportType,
  SessionPowerData,
  SessionHrData,
  SessionPaceData,
} from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// SportType mapping
// ─────────────────────────────────────────────────────────────────────────────

export function mapStravaSportType(sportType: string): SportType | null {
  const k = (sportType ?? '').toLowerCase();

  if (k === 'trailrun') return 'TRAIL_RUN';
  if (k === 'run' || k.includes('run') || k === 'virtualrun') return 'RUN';
  if (k === 'mountainbikeride' || k === 'gravelride') return 'MTB';
  if (k.includes('ride') || k.includes('cycl') || k === 'virtualride' || k === 'ebikeride')
    return 'BIKE';
  if (k === 'openwater') return 'OPEN_WATER';
  if (k === 'swim') return 'SWIM';
  if (k === 'triathlon') return 'TRIATHLON';
  if (k === 'yoga') return 'YOGA';
  if (k === 'weighttraining' || k === 'workout' || k === 'crossfit' || k === 'hiit')
    return 'STRENGTH';

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Strava activity to a RawSessionObservation.
 * Returns null if the activity type is not supported by SHARPIT.
 */
export function stravaActivityToSession(
  activity: StravaActivity,
  receivedAt: Date,
): RawSessionObservation | null {
  const sportType = mapStravaSportType(activity.sport_type ?? activity.type);
  if (!sportType) return null;

  const durationSec = activity.moving_time || activity.elapsed_time || null;
  if (!durationSec) return null;

  const externalId = String(activity.id);
  const timestamp = new Date(activity.start_date);

  // Power data (Strava provides average_watts and weighted_average_watts)
  let powerData: SessionPowerData | undefined;
  if (activity.average_watts && activity.average_watts > 0) {
    powerData = {
      avgWatts: activity.average_watts,
      normalizedPower: activity.weighted_average_watts ?? undefined,
      // Strava does not distinguish power meter vs estimated power
      // Default to MEASURED_DIRECT for cycling (most Strava users with power have a meter)
      quality: sportType === 'BIKE' || sportType === 'MTB' ? 'MEASURED_DIRECT' : 'MEASURED_OPTICAL',
    };
  }

  // HR data — Strava doesn't specify measurement method
  let hrData: SessionHrData | undefined;
  if (activity.average_heartrate && activity.average_heartrate > 0) {
    hrData = {
      avgBpm: Math.round(activity.average_heartrate),
      // Default to MEASURED_OPTICAL (conservative — unknown if chest strap or wrist)
      quality: 'MEASURED_OPTICAL',
    };
  }

  // Pace data (running/swimming)
  let paceData: SessionPaceData | undefined;
  if (activity.average_speed && activity.average_speed > 0 && activity.distance > 0) {
    if (['RUN', 'TRAIL_RUN', 'SWIM', 'OPEN_WATER'].includes(sportType)) {
      paceData = {
        avgMinPerKm: 1000 / activity.average_speed / 60,
        distanceM: activity.distance,
      };
    }
  }

  // Strava suffer_score is their proprietary effort metric — treat as PROPRIETARY_MODEL
  let sourceProvidedStress: RawSessionObservation['sourceProvidedStress'];
  if (!powerData && activity.suffer_score && activity.suffer_score > 0) {
    sourceProvidedStress = {
      value: activity.suffer_score,
      quality: 'PROPRIETARY_MODEL',
    };
  }

  return {
    type: 'SESSION',
    source: 'STRAVA',
    timestamp,
    receivedAt,
    sportType,
    durationSec,
    externalId,
    title: activity.name,
    powerData,
    hrData,
    paceData,
    elevationM: activity.total_elevation_gain > 0 ? activity.total_elevation_gain : undefined,
    sourceProvidedStress,
  };
}
