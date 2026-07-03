/**
 * OBSERVATION ENGINE — Type System
 *
 * This file is the single source of truth for every observation type in SHARPIT.
 * All 9 observation types form a discriminated union. The type discriminant is
 * the `type` field on each Raw* variant.
 *
 * Invariants enforced at the type level:
 *   - Raw* types are inputs (from adapters). They carry no ID, no athleteId.
 *   - Observation types are outputs (from the engine). They carry ObservationMeta.
 *   - GARMIN_READINESS and GARMIN_BATTERY are always PROPRIETARY_MODEL quality.
 *   - rpe/feeling are NOT on RawSessionObservation — they are separate SubjectiveObservations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitive enums
// ─────────────────────────────────────────────────────────────────────────────

export type ObservationType =
  | 'SESSION'
  | 'SLEEP'
  | 'HRV'
  | 'RESTING_HR'
  | 'SUBJECTIVE'
  | 'PHYSICAL_CONDITION'
  | 'BODY_COMPOSITION'
  | 'GARMIN_READINESS'
  | 'GARMIN_BATTERY';

export type ObservationSource =
  'GARMIN' | 'STRAVA' | 'MANUAL' | 'RENPHO' | 'WITHINGS' | 'GOOGLE_FIT';

export type SportType =
  | 'RUN'
  | 'BIKE'
  | 'SWIM'
  | 'STRENGTH'
  | 'OPEN_WATER'
  | 'TRAIL_RUN'
  | 'MTB'
  | 'TRIATHLON'
  | 'YOGA'
  | 'OTHER';

export type BodySide = 'LEFT' | 'RIGHT' | 'BILATERAL';

export type PhysicalCategory = 'PAIN' | 'INJURY' | 'MOBILITY' | 'POSTURE';

// ─────────────────────────────────────────────────────────────────────────────
// Quality system
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes HOW an observation was produced. This is a property of the
 * measurement method — not the value itself. Higher quality = more reliable
 * input to downstream Models.
 *
 * INVARIANT: Quality can only be downgraded, never upgraded. A PROPRIETARY_MODEL
 * output can never become MEASURED_DIRECT regardless of downstream use.
 *
 * Ordered from most to least reliable.
 */
export type ObservationQuality =
  | 'MEASURED_DIRECT' // Dedicated hardware sensor (power meter, chest strap HRM)
  | 'MEASURED_OPTICAL' // Optical sensor (wrist HRM, Garmin overnight HRV)
  | 'MANUAL' // Athlete self-report
  | 'ESTIMATED' // Derived approximation (HR→TSS, duration×sport_factor)
  | 'PROPRIETARY_MODEL'; // Third-party undocumented algorithm (Garmin Readiness, Body Battery)

/**
 * Specific concerns attached to an observation. Multiple flags may coexist.
 * Consumers downstream (Signal Engine, Models) use flags to adjust confidence.
 */
export type QualityFlag =
  | 'OPTICAL_SENSOR' // Less reliable than direct measurement
  | 'ESTIMATED_FROM_HR' // TSS estimated from heart rate (±25% error)
  | 'ESTIMATED_FROM_DURATION' // TSS from duration×sport_factor (±40% error)
  | 'PROPRIETARY_MODEL_OUTPUT' // Garmin's undocumented algorithm applied
  | 'POST_EXERCISE_CONTAMINATION' // Measurement taken too soon after exercise
  | 'UNUSUAL_VALUE' // Biologically plausible but statistically unusual
  | 'UNUSUALLY_LONG_SLEEP' // Sleep >10h (possible but worth flagging)
  | 'BASELINE_PENDING'; // Cannot be contextualized without an established baseline

// ─────────────────────────────────────────────────────────────────────────────
// Rejection reasons
// ─────────────────────────────────────────────────────────────────────────────

export type RejectionReason =
  | {
      code: 'OUT_OF_PLAUSIBLE_RANGE';
      field: string;
      value: number;
      min: number;
      max: number;
    }
  | { code: 'REQUIRED_FIELD_MISSING'; field: string }
  | { code: 'TEMPORAL_INCONSISTENCY'; detail: string }
  | { code: 'NO_MEANINGFUL_DATA'; detail: string };

// ─────────────────────────────────────────────────────────────────────────────
// Shared raw base
// ─────────────────────────────────────────────────────────────────────────────

type RawObservationBase = {
  source: ObservationSource;
  /** When the observation was physically recorded (NOT when SHARPIT received it). */
  timestamp: Date;
  /** When SHARPIT received this observation (used for latency monitoring). */
  receivedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────────────────────

export type SessionPowerData = {
  avgWatts: number;
  normalizedPower?: number;
  intensityFactor?: number;
  /**
   * TSS pre-computed by Garmin. This is NOT SHARPIT's canonical Training Stress.
   * The Stress Estimation Model will compute its own TSS from raw power/HR data.
   * This field is kept for cross-validation only.
   */
  sourceComputedTss?: number;
  quality: 'MEASURED_DIRECT' | 'MEASURED_OPTICAL';
};

export type SessionHrData = {
  avgBpm: number;
  maxBpm?: number;
  quality: 'MEASURED_DIRECT' | 'MEASURED_OPTICAL';
};

export type SessionPaceData = {
  avgMinPerKm: number;
  distanceM: number;
};

export type RawSessionObservation = RawObservationBase & {
  type: 'SESSION';
  sportType: SportType;
  /** Effective training duration in seconds. Required. */
  durationSec: number;
  /** Platform identifier for deduplication (garminId or stravaId). */
  externalId?: string;
  title?: string;
  notes?: string;
  powerData?: SessionPowerData;
  hrData?: SessionHrData;
  paceData?: SessionPaceData;
  elevationM?: number;
  calories?: number;
  /**
   * Training Stress Score reported by the source platform (e.g., Garmin TSS).
   * SHARPIT's own TSS is computed by the Stress Estimation Model — not here.
   */
  sourceProvidedStress?: {
    value: number;
    quality: 'ESTIMATED' | 'PROPRIETARY_MODEL';
  };
  /**
   * NOTE: rpe and feeling are NOT fields on Session.
   * They are separate RawSubjectiveObservations with an optional sessionExternalId reference.
   * This is a deliberate domain decision: subjective experience is an independent
   * observation layer, not a property of the physical training event.
   */
};

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP
// ─────────────────────────────────────────────────────────────────────────────

export type RawSleepObservation = RawObservationBase & {
  type: 'SLEEP';
  /** Sleep onset (bedtime). Stored in `timestamp`. */
  /** When the athlete woke up. Used for training-day assignment. */
  wakeTimestamp: Date;
  /** Total sleep time in minutes. Required. */
  totalMinutes: number;
  deepMin?: number;
  remMin?: number;
  lightMin?: number;
  awakeMin?: number;
  /**
   * Garmin Sleep Score (0-100).
   * Quality: PROPRIETARY_MODEL — stored for reference only.
   */
  garminScore?: number;
  avgRespirationRate?: number;
  avgStressDuringSleep?: number;
  /** Bedtime in minutes since local midnight (e.g., 22:30 → 1350). */
  bedtimeMinFromMidnight?: number;
  /** Wake time in minutes since local midnight (e.g., 06:30 → 390). */
  wakeMinFromMidnight?: number;
  /** Garmin's feedback code (VERY_GOOD, MODERATE, LOW, etc.). */
  scoreFeedbackCode?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// HRV
// ─────────────────────────────────────────────────────────────────────────────

export type HrvMeasurementMethod =
  | 'OVERNIGHT_AVERAGE' // Garmin overnight optical average (least precise)
  | 'MORNING_SHORT' // 5-minute morning reading (moderate precision)
  | 'CHEST_STRAP'; // Full HRV measurement (highest precision)

export type RawHrvObservation = RawObservationBase & {
  type: 'HRV';
  /**
   * HRV in milliseconds (RMSSD).
   * RMSSD is the only scientifically validated metric for daily recovery monitoring.
   * (Buchheit 2014, Plews et al. 2013)
   */
  valueMsRmssd: number;
  measurementMethod: HrvMeasurementMethod;
  /**
   * Garmin's proprietary HRV classification.
   * BALANCED / UNBALANCED_LOW / UNBALANCED_HIGH / LOW / POOR
   * For cross-reference only. Not used by SHARPIT's HRV Signal extractor.
   */
  garminStatus?: string;
  /** Garmin's personal HRV baseline bounds. For reference/audit only. */
  garminBaselineLow?: number;
  garminBaselineHigh?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// RESTING_HR
// ─────────────────────────────────────────────────────────────────────────────

export type RawRestingHrObservation = RawObservationBase & {
  type: 'RESTING_HR';
  valueBpm: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTIVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An athlete's self-report on their subjective experience.
 *
 * This is deliberately separate from SessionObservation. Subjective feedback is
 * an independent observation type — it carries epistemic value the objective
 * data cannot provide, and it may exist without a corresponding session
 * (e.g., a morning mood check-in with no training that day).
 */
export type RawSubjectiveObservation = RawObservationBase & {
  type: 'SUBJECTIVE';
  /** Borg CR10 scale (0–10, including 0.5 increments). */
  rpe?: number;
  /** General mood / psychological readiness (1–5). */
  mood?: number;
  /** Overall perceived soreness / body heaviness (0–10). */
  perceivedSoreness?: number;
  /** Perceived energy / vitality level (1–5). */
  energyLevel?: number;
  /** Perceived psychological stress (1–5). */
  stressLevel?: number;
  /**
   * Optional reference to the session this subjective feedback relates to.
   * Links the subjective observation to its corresponding SessionObservation.
   */
  sessionExternalId?: string;
  notes?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICAL_CONDITION
// ─────────────────────────────────────────────────────────────────────────────

export type RawPhysicalConditionObservation = RawObservationBase & {
  type: 'PHYSICAL_CONDITION';
  category: PhysicalCategory;
  /** Anatomical region (e.g., "Genou", "Mollet", "Dos lombaire"). */
  bodyRegion: string;
  bodySide: BodySide;
  /** 0 = no pain/limitation, 10 = maximum severity. */
  severity: number;
  description?: string;
  /**
   * Reference to an existing PhysicalCondition record.
   * When set: this is a check-in update on an existing condition.
   * When absent: this is a new condition being reported.
   */
  conditionId?: string;
  affectsTraining?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// BODY_COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────

export type RawBodyCompositionObservation = RawObservationBase & {
  type: 'BODY_COMPOSITION';
  /** Body weight in kilograms. Required. */
  weightKg: number;
  fatPercent?: number;
  /** Muscle mass as a percentage of body weight. Provided by bio-impedance scales (Renpho). */
  musclePercent?: number;
  waterPercent?: number;
  /** Bone mass in kilograms. */
  boneMassKg?: number;
  visceralFat?: number;
  bmi?: number;
  /** Source-platform measurement ID for deduplication (e.g., Renpho measurement ID). */
  externalId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// GARMIN_READINESS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Garmin Training Readiness Score.
 *
 * ⚠️ QUALITY INVARIANT: always ObservationQuality.PROPRIETARY_MODEL.
 *
 * This is Garmin's undocumented algorithm applied to the athlete's physiological
 * data. There is no peer-reviewed publication describing this algorithm.
 *
 * Design consequence: the Recovery Synthesis Model must NOT use this as its
 * primary input. It must run independently on raw HRV/RHR/Sleep observations.
 * This score is retained for cross-reference and historical comparison only.
 */
export type RawGarminReadinessObservation = RawObservationBase & {
  type: 'GARMIN_READINESS';
  /** 0–100. */
  score: number;
  /** VERY_HIGH | HIGH | MODERATE | LOW | VERY_LOW */
  level?: string;
  /** Garmin's short feedback code. */
  feedbackCode?: string;
  /** Garmin's declared contributing factors for this score. */
  contributingFactors?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// GARMIN_BATTERY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Garmin Body Battery score.
 *
 * ⚠️ QUALITY INVARIANT: always ObservationQuality.PROPRIETARY_MODEL.
 * Same architectural constraints as GARMIN_READINESS.
 */
export type RawBodyBatteryObservation = RawObservationBase & {
  type: 'GARMIN_BATTERY';
  /** Peak body battery during the day (0–100). */
  peakValue: number;
  /** Lowest body battery during the day (0–100). */
  troughValue?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Union type — the single input accepted by the engine
// ─────────────────────────────────────────────────────────────────────────────

export type RawObservation =
  | RawSessionObservation
  | RawSleepObservation
  | RawHrvObservation
  | RawRestingHrObservation
  | RawSubjectiveObservation
  | RawPhysicalConditionObservation
  | RawBodyCompositionObservation
  | RawGarminReadinessObservation
  | RawBodyBatteryObservation;

// ─────────────────────────────────────────────────────────────────────────────
// Observation metadata — added by the engine to every accepted observation
// ─────────────────────────────────────────────────────────────────────────────

export type ObservationMeta = {
  /** Globally unique ID assigned by the engine. Immutable after assignment. */
  readonly id: string;
  readonly athleteId: string;
  readonly quality: ObservationQuality;
  readonly qualityFlags: ReadonlyArray<QualityFlag>;
  /**
   * Training day this observation belongs to (YYYY-MM-DD in athlete's timezone).
   *
   * May differ from the calendar day:
   *   - A sleep ending at 07:30 on 2026-07-02 → trainingDayId = "2026-07-02"
   *     (the sleep belongs to the day the athlete is preparing for)
   *   - A session at 03:45 on 2026-07-02 (before 04:00 start)
   *     → trainingDayId = "2026-07-01" (still the prior training day)
   */
  readonly trainingDayId: string;
  readonly normalizedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalized observation types (outputs — engine produces these)
// ─────────────────────────────────────────────────────────────────────────────

export type SessionObservation = ObservationMeta & RawSessionObservation;
export type SleepObservation = ObservationMeta & RawSleepObservation;
export type HrvObservation = ObservationMeta & RawHrvObservation;
export type RestingHrObservation = ObservationMeta & RawRestingHrObservation;
export type SubjectiveObservation = ObservationMeta & RawSubjectiveObservation;
export type PhysicalConditionObservation = ObservationMeta & RawPhysicalConditionObservation;
export type BodyCompositionObservation = ObservationMeta & RawBodyCompositionObservation;
export type GarminReadinessObservation = ObservationMeta & RawGarminReadinessObservation;
export type BodyBatteryObservation = ObservationMeta & RawBodyBatteryObservation;

export type Observation =
  | SessionObservation
  | SleepObservation
  | HrvObservation
  | RestingHrObservation
  | SubjectiveObservation
  | PhysicalConditionObservation
  | BodyCompositionObservation
  | GarminReadinessObservation
  | BodyBatteryObservation;

// ─────────────────────────────────────────────────────────────────────────────
// Engine result types
// ─────────────────────────────────────────────────────────────────────────────

export type IngestionResult =
  | { readonly status: 'ACCEPTED'; readonly observation: Observation }
  | {
      readonly status: 'ACCEPTED_FLAGGED';
      readonly observation: Observation;
      readonly flags: ReadonlyArray<QualityFlag>;
    }
  | { readonly status: 'REJECTED'; readonly reason: RejectionReason }
  | { readonly status: 'DUPLICATE'; readonly existingId: string };

export type BatchIngestionResult = {
  readonly accepted: Observation[];
  readonly flagged: ReadonlyArray<{ observation: Observation; flags: ReadonlyArray<QualityFlag> }>;
  readonly rejected: ReadonlyArray<{ raw: RawObservation; reason: RejectionReason }>;
  readonly duplicates: ReadonlyArray<{ raw: RawObservation; existingId: string }>;
  readonly stats: {
    total: number;
    accepted: number;
    flagged: number;
    rejected: number;
    duplicates: number;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Query types
// ─────────────────────────────────────────────────────────────────────────────

export type ObservationFilter = {
  types?: ObservationType[];
  since?: Date;
  until?: Date;
  sources?: ObservationSource[];
  /** Only return observations at or above this quality level. */
  qualityMin?: ObservationQuality;
  trainingDayId?: string;
  trainingDayIds?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Engine configuration
// ─────────────────────────────────────────────────────────────────────────────

export type AthleteObservationConfig = {
  /**
   * Hour of day (0–23) that marks the start of a new training day.
   * Default: 4 (04:00). Configurable per athlete.
   *
   * Observations received before this hour are assigned to the previous
   * training day (e.g., a 03:30 session on 2026-07-02 belongs to 2026-07-01).
   */
  trainingDayStartHour?: number;
  /** Athlete's local timezone (IANA format, e.g., 'Europe/Paris'). */
  timezone?: string;
};
