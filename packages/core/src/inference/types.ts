/**
 * INFERENCE LAYER — Core Types
 *
 * Defines the contracts shared across all inference models:
 *   - Signal (ephemeral, but captured in DecisionRecord)
 *   - DecisionRecord (immutable audit trail, persisted)
 *   - AthleteStateUpdate (delta applied to Digital Twin)
 *
 * Per ADR-004: Signals are NOT persisted independently.
 * They are ephemeral values produced during a single inference pass
 * and embedded verbatim into the Decision Record for auditability.
 *
 * The Decision Record is IMMUTABLE after creation. It is the source of
 * truth for explaining any recommendation at any point in the future.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Model identity
// ─────────────────────────────────────────────────────────────────────────────

export type ModelId =
  | 'recovery-synthesis-v1'
  | 'fatigue-v1'
  | 'adaptation-v1'
  | 'reasoning-v1'
  | 'physical-health-v1'
  | 'environment-v1.1';

// ─────────────────────────────────────────────────────────────────────────────
// Decision Record — persisted audit trail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Immutable record of one inference pass.
 * Created when any inference model runs for a given training day.
 *
 * It captures the complete inference snapshot:
 *   - Which features were consumed (inputSummary)
 *   - What signals were produced (signals)
 *   - What state update was applied to the Digital Twin (stateUpdate)
 *   - What recommendation was generated (recommendation)
 *   - Why (explanation — human-readable)
 *
 * The Decision Record is the single source of truth for explanation
 * and historical audit. It must be reproducible from inputSummary
 * using the same model version.
 */
export type DecisionRecord = {
  readonly id: string;
  readonly athleteId: string;
  readonly trainingDayId: string;

  readonly modelId: ModelId;
  readonly modelVersion: string;

  /** Key feature values consumed (subset — not full DayFeatures to avoid bloat). */
  readonly inputSummary: Record<string, unknown>;

  /** Ephemeral signals produced during this inference pass. */
  readonly signals: Record<string, unknown>;

  /** Delta applied to the Digital Twin's AthleteState. */
  readonly stateUpdate: Record<string, unknown>;

  /** The concrete action/verdict decided from signals. */
  readonly decision: Record<string, unknown>;

  /** The recommendation surfaced to the athlete. */
  readonly recommendation: Record<string, unknown>;

  /** Human-readable explanation. Set only by the reasoning model; omitted by recovery/fatigue/adaptation models. */
  readonly explanation?: string;

  /** 0.0–1.0 — how much to trust this decision. */
  readonly confidence: number;

  readonly computedAt: Date;
  readonly createdAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Repository port for Decision Records
// ─────────────────────────────────────────────────────────────────────────────

export interface DecisionRecordRepository {
  /** Persist a new immutable Decision Record. */
  save(record: DecisionRecord): Promise<void>;

  /** Find the latest Decision Record for a model on a given training day. */
  findLatest(
    athleteId: string,
    modelId: ModelId,
    trainingDayId: string,
  ): Promise<DecisionRecord | null>;

  /** Find all Decision Records for an athlete within a date range. */
  findByRange(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ): Promise<DecisionRecord[]>;

  /**
   * Find the N most recent Decision Records for a model (any training day).
   * Results are ordered by computedAt descending (most recent first).
   * Used by the Fatigue Orchestrator to reconstruct fatigue history.
   */
  findRecent(athleteId: string, modelId: ModelId, limit: number): Promise<DecisionRecord[]>;
}
