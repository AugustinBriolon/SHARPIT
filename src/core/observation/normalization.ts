/**
 * OBSERVATION ENGINE — Normalization
 *
 * Pure functions. No I/O. No side effects. No framework dependencies.
 *
 * Responsibilities:
 *   1. Assign a training-day ID (handles the athlete-configurable day boundary)
 *   2. Classify quality (based on measurement method + source)
 *   3. Produce the final Observation by merging raw data with ObservationMeta
 *
 * This function MUST NOT perform domain reasoning:
 *   - No TSS computation
 *   - No baseline comparison
 *   - No signal extraction
 *   - No interpretation of any value
 */

import type {
  RawObservation,
  Observation,
  ObservationMeta,
  ObservationQuality,
  QualityFlag,
  AthleteObservationConfig,
} from './types';

const DEFAULT_TRAINING_DAY_START_HOUR = 4;
const DEFAULT_TIMEZONE = 'Europe/Paris';

// ─────────────────────────────────────────────────────────────────────────────
// Training-day assignment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the training-day ID (YYYY-MM-DD in athlete's local timezone).
 *
 * A training day starts at `trainingDayStartHour` in the athlete's timezone.
 * An observation timestamped before that hour belongs to the PREVIOUS training day.
 *
 * Example with startHour = 4:
 *   2026-07-02 03:30 UTC+2 → "2026-07-01" (before 04:00 → prior training day)
 *   2026-07-02 04:30 UTC+2 → "2026-07-02" (after 04:00 → current training day)
 */
function computeTrainingDayId(
  anchorTimestamp: Date,
  trainingDayStartHour: number,
  timezone: string,
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(anchorTimestamp).map(({ type, value }) => [type, value]),
  );

  const localHour = parseInt(parts.hour, 10);

  if (localHour < trainingDayStartHour) {
    // Before the training day boundary → reformat the previous calendar day.
    // We subtract 24h from the anchor and re-run the same formatter to stay in
    // the athlete's timezone throughout (avoids timezone-contaminated Date constructor).
    const prevDayAnchor = new Date(anchorTimestamp.getTime() - 24 * 60 * 60_000);
    const prevParts = Object.fromEntries(
      formatter.formatToParts(prevDayAnchor).map(({ type, value }) => [type, value]),
    );
    return `${prevParts.year}-${prevParts.month}-${prevParts.day}`;
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Returns the timestamp to use for training-day assignment.
 *
 * For SLEEP: the wake time determines which training day the sleep belongs to.
 *   (A sleep on the night of 2026-07-01/02 that ends at 07:00 on 2026-07-02
 *    belongs to training day 2026-07-02, the day the athlete is preparing for.)
 *
 * For all other types: use the observation timestamp directly.
 */
function getTrainingDayAnchor(raw: RawObservation): Date {
  if (raw.type === 'SLEEP') return raw.wakeTimestamp;
  return raw.timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality classification
// ─────────────────────────────────────────────────────────────────────────────

function deriveQuality(raw: RawObservation): ObservationQuality {
  switch (raw.type) {
    case 'SESSION': {
      if (raw.powerData?.quality === 'MEASURED_DIRECT') return 'MEASURED_DIRECT';
      if (raw.hrData?.quality === 'MEASURED_DIRECT') return 'MEASURED_DIRECT';
      if (raw.hrData?.quality === 'MEASURED_OPTICAL') return 'MEASURED_OPTICAL';
      return 'ESTIMATED';
    }
    case 'HRV':
      return raw.measurementMethod === 'CHEST_STRAP' ? 'MEASURED_DIRECT' : 'MEASURED_OPTICAL';
    case 'SLEEP':
    case 'RESTING_HR':
      return 'MEASURED_OPTICAL';
    case 'SUBJECTIVE':
    case 'PHYSICAL_CONDITION':
      return 'MANUAL';
    case 'BODY_COMPOSITION':
      return raw.source === 'MANUAL' ? 'MANUAL' : 'MEASURED_DIRECT';
    case 'GARMIN_READINESS':
    case 'GARMIN_BATTERY':
      return 'PROPRIETARY_MODEL';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a normalized Observation from a validated raw observation.
 *
 * Called exclusively by the engine after a successful validate() call.
 * The `id` has already been assigned by the engine before this call.
 */
export function normalize(
  id: string,
  athleteId: string,
  raw: RawObservation,
  validationFlags: QualityFlag[],
  config?: AthleteObservationConfig,
): Observation {
  const trainingDayStartHour = config?.trainingDayStartHour ?? DEFAULT_TRAINING_DAY_START_HOUR;
  const timezone = config?.timezone ?? DEFAULT_TIMEZONE;

  const anchor = getTrainingDayAnchor(raw);
  const trainingDayId = computeTrainingDayId(anchor, trainingDayStartHour, timezone);
  const quality = deriveQuality(raw);

  const meta: ObservationMeta = {
    id,
    athleteId,
    quality,
    qualityFlags: Object.freeze(validationFlags),
    trainingDayId,
    normalizedAt: new Date(),
  };

  // Spread order matters: meta fields must not be overwritten by raw fields.
  // The discriminant `type` comes from raw; meta fields (id, athleteId, etc.) are new.
  return { ...raw, ...meta } as Observation;
}
