/**
 * ENVIRONMENTAL CONTEXT ENGINE — Public API (environment-v1.1)
 *
 * Frozen contract — see docs/models/ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md
 */

export { ENVIRONMENTAL_CONTEXT_ENGINE_VERSION } from './types';

export type {
  EnvironmentalProviderId,
  EnvironmentalObservationSource,
  EnvironmentalTemporalScope,
  ExposureSetting,
  EnvironmentalApplicability,
  GeoLocation,
  EnvironmentalDimension,
  WeatherMeasurements,
  WeatherField,
  TerrainContext,
  AltitudeContext,
  AirQualityMeasurements,
  DimensionPayload,
  EnvironmentalEvidenceQuality,
  FieldQuality,
  ProviderSnapshot,
  EnvironmentalObservationRecord,
  ActivityEnvironmentBinding,
  MetricUnavailableReason,
  AvailableMetric,
  UnavailableMetric,
  MetricValue,
  EnvironmentalStressorId,
  EnvironmentalStressObservationRef,
  EnvironmentalStressor,
  EnvironmentalStress,
  RecoveryAdjustment,
  FatigueAdjustment,
  PerformanceAdjustment,
  HydrationAdjustment,
  HeatAcclimationDemand,
  EnvironmentalImpact,
  EnvironmentalExplanation,
  ActivityEnvironmentalCorrectionFactor,
  ActivityEnvironmentalCorrection,
  EnvironmentalDataCompleteness,
  ActivityEnvironment,
  TodayEnvironment,
  EnvironmentalPrediction,
  ForecastEnvironment,
  EnvironmentalContext,
} from './types';

export { isMetricAvailable } from './types';

export type {
  EnvironmentalFetchRequest,
  ProviderFailureReason,
  EnvironmentalProviderResult,
  ProviderAvailabilityContext,
  EnvironmentalProvider,
  AdapterMeta,
  EnvironmentalProviderAdapter,
  ProviderAttempt,
  ProviderCollectionOutcome,
  EnvironmentalIngestOutcome,
  ObservationIdFactory,
  EnvironmentalProviderRegistry,
} from './provider';

export type { ObservationRecordDraft } from './record';
export {
  computeProviderPayloadHash,
  createProviderSnapshot,
  ingestObservationRecord,
  supersedeObservationRecord,
  isRecordActive,
  extractWeatherFromRecords,
} from './record';

export type { ApplicabilityInput } from './applicability';
export {
  resolveEnvironmentalApplicability,
  isEnvironmentApplicable,
  applicabilityToExposure,
} from './applicability';

export {
  fieldQualityExact,
  fieldQualityInterpolated,
  fieldQualityEstimated,
  fieldQualityMissing,
  weatherFieldQuality,
  aggregateFieldQuality,
  confidenceFromFieldQualities,
  confidenceFromRecords,
} from './quality';

export type { ProviderObservationBundle, MergePolicy, MergeConflictStrategy } from './merge';
export { DEFAULT_MERGE_POLICY, mergeObservationDrafts } from './merge';

export {
  collectEnvironmentalObservationDrafts,
  ingestEnvironmentalRecords,
  fetchAndIngestEnvironmentalRecords,
} from './orchestrator';

export type {
  BuildActivityEnvironmentInput,
  BuildTodayEnvironmentInput,
  BuildForecastEnvironmentInput,
} from './contexts';
export {
  buildActivityEnvironment,
  buildTodayEnvironment,
  buildForecastEnvironment,
} from './contexts';

export {
  buildEnvironmentalStress,
  getEnvironmentalStressor,
  listKnownEnvironmentalStressorIds,
} from './stress';
export { buildEnvironmentalImpact } from './impact';
export type { BuildActivityEnvironmentalCorrectionInput } from './correction';
export { buildActivityEnvironmentalCorrection } from './correction';

export { computeHeatIndexC } from './metrics/heat-index';
export { computeEstimatedWetBulbC } from './metrics/wet-bulb';
export { computeWbgtC } from './metrics/wbgt';
