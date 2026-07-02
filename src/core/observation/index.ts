/**
 * OBSERVATION ENGINE — Public API
 *
 * This is the only file external consumers should import from.
 * Internal modules (validation, normalization) are not re-exported.
 */

export { ObservationEngine } from './engine';
export type { ObservationEngineDeps } from './engine';

export type {
  // Raw observation types — for adapters (Garmin, Strava, Renpho, Manual)
  RawObservation,
  RawSessionObservation,
  RawSleepObservation,
  RawHrvObservation,
  RawRestingHrObservation,
  RawSubjectiveObservation,
  RawPhysicalConditionObservation,
  RawBodyCompositionObservation,
  RawGarminReadinessObservation,
  RawBodyBatteryObservation,
  // Sub-types used in raw observations
  SessionPowerData,
  SessionHrData,
  SessionPaceData,
  HrvMeasurementMethod,
  // Normalized observation types — for domain consumers (Signal Engine, Models, UI)
  Observation,
  SessionObservation,
  SleepObservation,
  HrvObservation,
  RestingHrObservation,
  SubjectiveObservation,
  PhysicalConditionObservation,
  BodyCompositionObservation,
  GarminReadinessObservation,
  BodyBatteryObservation,
  // Metadata added by the engine
  ObservationMeta,
  // Core enums
  ObservationType,
  ObservationSource,
  ObservationQuality,
  QualityFlag,
  RejectionReason,
  SportType,
  PhysicalCategory,
  BodySide,
  // Engine I/O
  IngestionResult,
  BatchIngestionResult,
  ObservationFilter,
  AthleteObservationConfig,
} from './types';

export type { ObservationRepository } from './repository';

export type {
  DomainEventBus,
  ObservationDomainEvent,
  ObservationIngested,
  HighSeverityConditionDetected,
  ObservationRejected,
} from './events';

export { nullEventBus } from './events';
