/**
 * OBSERVATION ENGINE — Domain Events
 *
 * Domain events communicate what happened inside the Observation Engine
 * to the rest of the system. They are facts — immutable records of
 * something that has occurred.
 *
 * The DomainEventBus interface is a port (infrastructure dependency).
 * The engine depends on this interface; the concrete implementation
 * (in-process EventEmitter, Redis pub/sub, etc.) lives in the infrastructure layer.
 */

import type {
  ObservationType,
  ObservationSource,
  ObservationQuality,
  QualityFlag,
  RejectionReason,
  PhysicalCategory,
  BodySide,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Event definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emitted when a raw observation has been validated, normalized, and persisted.
 *
 * Downstream consumers (Signal Engine, Digital Twin Updater, etc.) subscribe
 * to this event to trigger the next stage in the inference pipeline.
 */
export type ObservationIngested = {
  readonly kind: 'ObservationIngested';
  readonly observationId: string;
  readonly athleteId: string;
  readonly type: ObservationType;
  readonly trainingDayId: string;
  readonly quality: ObservationQuality;
  readonly flags: ReadonlyArray<QualityFlag>;
  readonly timestamp: Date;
  readonly emittedAt: Date;
};

/**
 * Emitted when a physical condition observation is ingested with severity ≥ 8.
 * Triggers an immediate review pathway in the coaching layer.
 */
export type HighSeverityConditionDetected = {
  readonly kind: 'HighSeverityConditionDetected';
  readonly observationId: string;
  readonly athleteId: string;
  readonly severity: number;
  readonly category: PhysicalCategory;
  readonly bodyRegion: string;
  readonly bodySide: BodySide;
  readonly emittedAt: Date;
};

/**
 * Emitted when a raw observation fails validation.
 * Used for monitoring, debugging, and adapter quality tracking.
 */
export type ObservationRejected = {
  readonly kind: 'ObservationRejected';
  readonly athleteId: string;
  readonly type: ObservationType;
  readonly source: ObservationSource;
  readonly reason: RejectionReason;
  readonly emittedAt: Date;
};

export type ObservationDomainEvent =
  ObservationIngested | HighSeverityConditionDetected | ObservationRejected;

// ─────────────────────────────────────────────────────────────────────────────
// Port
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infrastructure port for publishing domain events.
 * The engine calls `publish()` — the infrastructure decides what to do next.
 */
export interface DomainEventBus {
  publish(event: ObservationDomainEvent): void | Promise<void>;
}

/**
 * No-op bus. Use in tests or when event publishing is not required.
 */
export const nullEventBus: DomainEventBus = {
  publish: () => undefined,
};
