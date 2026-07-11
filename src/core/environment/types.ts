/**
 * ENVIRONMENTAL CONTEXT ENGINE — Public Domain Contract (environment-v1.1)
 *
 * @see docs/models/ENVIRONMENTAL_CONTEXT_ENGINE.md
 * @see docs/models/ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md
 */

export const ENVIRONMENTAL_CONTEXT_ENGINE_VERSION = 'environment-v1.1' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentalProviderId =
  'open-meteo' | 'openweather' | 'apple-weather' | 'garmin-weather' | 'race-dataset' | 'manual';

export type EnvironmentalObservationSource =
  'PROVIDER' | 'MANUAL' | 'ACTIVITY_ENRICHMENT' | 'RACE_DATASET';

export type EnvironmentalTemporalScope = 'POINT' | 'INTERVAL' | 'DAILY';

/** Where the measurement applies geographically / exposure-wise. */
export type ExposureSetting = 'OUTDOOR' | 'INDOOR' | 'UNKNOWN';

/**
 * Whether environmental context should influence a target (e.g. an activity).
 * INDOOR activities must not consume outdoor weather impact.
 */
export type EnvironmentalApplicability = 'OUTDOOR' | 'INDOOR' | 'PARTIALLY_EXPOSED' | 'UNKNOWN';

export type GeoLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeM?: number | null;
  readonly label?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dimensions
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentalDimension = 'WEATHER' | 'TERRAIN' | 'ALTITUDE' | 'AIR_QUALITY';

export type WeatherMeasurements = {
  readonly airTemperatureC?: number | null;
  readonly apparentTemperatureC?: number | null;
  readonly relativeHumidityPct?: number | null;
  readonly dewPointC?: number | null;
  readonly wetBulbC?: number | null;
  readonly globeTemperatureC?: number | null;
  readonly windSpeedMps?: number | null;
  readonly windGustMps?: number | null;
  readonly windDirectionDeg?: number | null;
  readonly precipitationMm?: number | null;
  readonly precipitationProbabilityPct?: number | null;
  readonly cloudCoverPct?: number | null;
  readonly solarRadiationWm2?: number | null;
  readonly uvIndex?: number | null;
  readonly atmosphericPressureHpa?: number | null;
  readonly visibilityM?: number | null;
};

export type WeatherField = keyof WeatherMeasurements;

export type TerrainContext = {
  readonly surfaceType: 'ROAD' | 'TRAIL' | 'TRACK' | 'MIXED' | 'UNKNOWN' | null;
  readonly elevationGainM: number | null;
  readonly technicalDifficulty: 'LOW' | 'MODERATE' | 'HIGH' | null;
};

export type AltitudeContext = {
  readonly elevationM: number | null;
  readonly elevationGainM: number | null;
};

export type AirQualityMeasurements = {
  readonly aqi: number | null;
  readonly pm25UgM3: number | null;
  readonly ozonePpb: number | null;
};

export type DimensionPayload =
  | { readonly dimension: 'WEATHER'; readonly data: WeatherMeasurements }
  | { readonly dimension: 'TERRAIN'; readonly data: TerrainContext }
  | { readonly dimension: 'ALTITUDE'; readonly data: AltitudeContext }
  | { readonly dimension: 'AIR_QUALITY'; readonly data: AirQualityMeasurements };

// ─────────────────────────────────────────────────────────────────────────────
// Evidence quality (distinct from confidence)
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentalEvidenceQuality = 'EXACT' | 'INTERPOLATED' | 'ESTIMATED' | 'MISSING';

export type FieldQuality = {
  readonly quality: EnvironmentalEvidenceQuality;
  readonly confidence: number;
  readonly method: string | null;
  readonly sourceProviderId: EnvironmentalProviderId | null;
};

export type ProviderSnapshot = {
  readonly providerId: EnvironmentalProviderId;
  readonly providerVersion: string | null;
  readonly payloadHash: string;
  readonly fetchedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Immutable observation record
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentalObservationRecord = {
  readonly id: string;
  readonly recordVersion: typeof ENVIRONMENTAL_CONTEXT_ENGINE_VERSION;
  readonly athleteId: string;
  readonly dimension: EnvironmentalDimension;
  readonly payload: DimensionPayload;
  readonly observedAt: Date;
  readonly receivedAt: Date;
  readonly ingestedAt: Date;
  readonly trainingDayId: string | null;
  readonly temporalScope: EnvironmentalTemporalScope;
  readonly intervalStart: Date | null;
  readonly intervalEnd: Date | null;
  readonly exposure: ExposureSetting;
  readonly location: GeoLocation;
  readonly source: EnvironmentalObservationSource;
  readonly providerId: EnvironmentalProviderId | null;
  readonly externalId: string | null;
  readonly providerSnapshot: ProviderSnapshot;
  readonly fieldQuality: Partial<Record<string, FieldQuality>>;
  readonly aggregateQuality: EnvironmentalEvidenceQuality;
  readonly confidence: number;
  readonly supersededBy: string | null;
};

export type ActivityEnvironmentBinding = {
  readonly activityId: string;
  readonly recordIds: readonly string[];
  readonly boundAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Metrics (quality + confidence are separate)
// ─────────────────────────────────────────────────────────────────────────────

export type MetricUnavailableReason =
  | 'MISSING_INPUT'
  | 'INSUFFICIENT_OBSERVATIONS'
  | 'OUT_OF_VALID_RANGE'
  | 'METHOD_NOT_APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'PROVIDER_DID_NOT_SUPPLY';

export type AvailableMetric<T> = {
  readonly available: true;
  readonly value: T;
  readonly quality: EnvironmentalEvidenceQuality;
  readonly confidence: number;
  readonly method: string;
  readonly basedOn: readonly string[];
};

export type UnavailableMetric = {
  readonly available: false;
  readonly quality: 'MISSING';
  readonly confidence: 0;
  readonly reason: MetricUnavailableReason;
  readonly explanation: string;
  readonly missingFields?: readonly string[];
};

export type MetricValue<T> = AvailableMetric<T> | UnavailableMetric;

export function isMetricAvailable<T>(metric: MetricValue<T>): metric is AvailableMetric<T> {
  return metric.available;
}

export type ThermalStressBand = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

/** @internal Engine-only deterministic derivations — not for physiological models. */
export type EnvironmentalFeatures = {
  readonly heatIndexC: MetricValue<number>;
  readonly estimatedWetBulbC: MetricValue<number>;
  readonly wbgtC: MetricValue<number>;
  readonly thermalStressBand: MetricValue<ThermalStressBand>;
  readonly windChillC: MetricValue<number>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Environmental Stress (domain signals — extensible stressor collection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known stressor identifiers. The union may extend in future minor versions.
 * Consumers must iterate `EnvironmentalStress.stressors` — never assume a fixed set.
 */
export type EnvironmentalStressorId = 'THERMAL' | 'WIND' | 'ALTITUDE' | 'AIR_QUALITY' | 'HYDRATION';

export type EnvironmentalStressObservationRef =
  | { readonly kind: 'RECORD'; readonly recordId: string }
  | { readonly kind: 'FIELD'; readonly recordId: string; readonly field: string };

/**
 * A single environmental stressor — physiological load imposed by one environmental factor.
 */
export type EnvironmentalStressor = {
  readonly id: EnvironmentalStressorId;
  readonly intensity: MetricValue<number>;
  readonly confidence: number;
  readonly supportingObservations: readonly EnvironmentalStressObservationRef[];
  readonly explanation: string;
};

/**
 * First-class domain object: collection of independent stressors.
 * Not a flat field bag — new stressors append to `stressors` without breaking consumers.
 */
export type EnvironmentalStress = {
  readonly applicability: EnvironmentalApplicability;
  readonly stressors: readonly EnvironmentalStressor[];
  readonly compositeIntensity: MetricValue<number>;
  readonly suppressionReason: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Environmental Impact (physiological adjustments — no environmental concepts)
// ─────────────────────────────────────────────────────────────────────────────

/** Multiplier on baseline recovery demand. 1.0 = unchanged; 1.2 = 20% more recovery needed. */
export type RecoveryAdjustment = {
  readonly demandMultiplier: MetricValue<number>;
};

/** Multiplier on fatigue accumulation rate. 1.0 = unchanged; 1.15 = 15% faster accumulation. */
export type FatigueAdjustment = {
  readonly accumulationMultiplier: MetricValue<number>;
};

/** Expected performance vs personal baseline. 1.0 = unchanged; 0.85 = expect 85% of normal output. */
export type PerformanceAdjustment = {
  readonly expectedOutputRatio: MetricValue<number>;
};

/** Fluid/electrolyte demand vs baseline. 1.0 = unchanged. */
export type HydrationAdjustment = {
  readonly demandMultiplier: MetricValue<number>;
};

/** Heat acclimation exposure benefit. 0 = none; 1 = high benefit from controlled heat exposure. */
export type HeatAcclimationDemand = {
  readonly exposureBenefit: MetricValue<number>;
};

/**
 * Physiological adjustments consumable by Recovery, Fatigue, Adaptation, Reasoning.
 * Contains no weather or environmental field names.
 */
export type EnvironmentalImpact = {
  readonly recovery: RecoveryAdjustment;
  readonly fatigue: FatigueAdjustment;
  readonly performance: PerformanceAdjustment;
  readonly hydration: HydrationAdjustment;
  readonly heatAcclimation: HeatAcclimationDemand;
  readonly confidence: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity Environmental Correction (explainability — never mutates raw metrics)
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentalExplanation = {
  readonly code: string;
  readonly params?: Readonly<Record<string, string | number>>;
};

export type ActivityEnvironmentalCorrectionFactor = {
  readonly stressorId: EnvironmentalStressorId;
  readonly attributedEffect: MetricValue<number>;
  readonly explanation: string;
  readonly confidence: number;
  readonly quality: EnvironmentalEvidenceQuality;
};

/**
 * Post-hoc performance explainability for a completed activity.
 * `rawMetricsPreserved` is always true — corrections never replace stored metrics.
 */
export type ActivityEnvironmentalCorrection = {
  readonly activityId: string;
  readonly rawMetricsPreserved: true;
  readonly factors: readonly ActivityEnvironmentalCorrectionFactor[];
  readonly totalAttributedEffect: MetricValue<number>;
  readonly narrative: readonly EnvironmentalExplanation[];
};

export type EnvironmentalDataCompleteness = 'COMPLETE' | 'PARTIAL' | 'MINIMAL' | 'NONE';

// ─────────────────────────────────────────────────────────────────────────────
// Context family (do not mix past / present / future)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityEnvironment = {
  readonly kind: 'ACTIVITY';
  readonly activityId: string;
  readonly athleteId: string;
  readonly window: { readonly start: Date; readonly end: Date };
  readonly applicability: EnvironmentalApplicability;
  readonly location: GeoLocation;
  readonly records: readonly EnvironmentalObservationRecord[];
  readonly binding: ActivityEnvironmentBinding;
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
  readonly correction: ActivityEnvironmentalCorrection;
  readonly dataCompleteness: EnvironmentalDataCompleteness;
  readonly confidence: number;
  readonly computedAt: Date;
};

export type TodayEnvironment = {
  readonly kind: 'TODAY';
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly referenceAt: Date;
  readonly location: GeoLocation;
  readonly records: readonly EnvironmentalObservationRecord[];
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
  readonly dataCompleteness: EnvironmentalDataCompleteness;
  readonly confidence: number;
  readonly providerIds: readonly EnvironmentalProviderId[];
  readonly computedAt: Date;
};

/** Forecast predictions are NOT observations — never persist as evidence. */
export type EnvironmentalPrediction = {
  readonly predictedAt: Date;
  readonly targetAt: Date;
  readonly dimension: EnvironmentalDimension;
  readonly payload: DimensionPayload;
  readonly quality: EnvironmentalEvidenceQuality;
  readonly confidence: number;
  readonly providerId: EnvironmentalProviderId;
};

export type ForecastEnvironment = {
  readonly kind: 'FORECAST';
  readonly athleteId: string;
  readonly targetWindow: { readonly start: Date; readonly end: Date };
  readonly location: GeoLocation;
  readonly predictions: readonly EnvironmentalPrediction[];
  readonly projectedStress: EnvironmentalStress;
  readonly projectedImpact: EnvironmentalImpact;
  readonly confidence: number;
  readonly computedAt: Date;
};

export type EnvironmentalContext = ActivityEnvironment | TodayEnvironment | ForecastEnvironment;
