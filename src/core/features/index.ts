/**
 * FEATURE ENGINE — Public API
 *
 * This is the only import boundary that external modules should use when
 * interacting with the Feature domain.
 *
 * Allowed consumers:
 *   - src/lib/feature-engine.ts (singleton wiring)
 *   - src/infrastructure/features/ (repository implementation)
 *   - Future: Inference Orchestrator (reads DayFeatures, calls getDayFeatures)
 *
 * Do NOT import from sub-modules (extractors/, types.ts, etc.) directly
 * outside of src/core/features/. Use this index instead.
 */

// Core engine
export { FeatureEngine } from './engine';
export type { FeatureEngineDeps, ExtractionContextProvider, BackfillResult } from './engine';

// Types
export type {
  // Feature sets
  SessionFeatureSet,
  LoadFeatureSet,
  RecoveryFeatureSet,
  BodyFeatureSet,
  ConditionFeatureSet,
  // Records
  FeatureSetRecord,
  SessionFeatureSetRecord,
  LoadFeatureSetRecord,
  RecoveryFeatureSetRecord,
  BodyFeatureSetRecord,
  ConditionFeatureSetRecord,
  // Lifecycle
  FeatureStatus,
  FeatureCategory,
  // Aggregated view
  DayFeatures,
  // History contexts (for testing / direct use)
  RecoveryHistory,
  LoadHistory,
  BodyHistory,
  ConditionHistory,
  SessionExtractorInput,
  // Sub-types
  TssMethod,
  SubjectiveWellnessComponents,
  ConditionTrend,
} from './types';

// Context
export type { ExtractionContext } from './context';
export { effectiveSleepTarget, canUsePowerTss, canUseTrimpTss, canUsePaceTss } from './context';

// Repository port
export type { FeatureRepository } from './repository';

// Pure extractors (exported for direct use in tests)
export { extractSessionFeatures } from './extractors/session-extractor';
export { extractLoadFeatures } from './extractors/load-extractor';
export { extractRecoveryFeatures, computeRpeVsTargetZone } from './extractors/recovery-extractor';
export { extractBodyFeatures } from './extractors/body-extractor';
export { extractConditionFeatures } from './extractors/condition-extractor';
