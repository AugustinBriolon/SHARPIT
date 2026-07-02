/**
 * ADAPTERS — Public API
 *
 * These adapters convert external platform data into SHARPIT's RawObservation types.
 * They are pure functions with no I/O. They are the only layer that knows about
 * platform-specific data structures.
 */

export {
  mapGarminSportType,
  garminActivityToSession,
  garminEvaluationToSubjective,
} from './garmin-activity-adapter';

export { garminHealthToObservations } from './garmin-health-adapter';

export { mapStravaSportType, stravaActivityToSession } from './strava-adapter';

export { renphoMeasurementToBodyComposition } from './renpho-adapter';
