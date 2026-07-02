/**
 * DEVELOPER PLATFORM — Public API
 *
 * Exports all developer tooling for the Feature Extraction Layer.
 * These tools are NOT used by the production inference pipeline.
 * They exist exclusively for engineering observability and debug workflows.
 *
 * Usage:
 *   import { ReplayEngine, PipelineInspector, FeatureExplorer, globalMetrics } from '@/core/dev'
 */

export { checksumFeatureData, checksumDayFeatures, sortObjectKeys } from './checksum';

export {
  EngineMetricsCollector,
  globalMetrics,
  type MetricsCollector,
  type MetricsSnapshot,
  type ExtractionEvent,
  type ExtractionCategory,
  type LatencyStats,
} from './metrics';

export {
  ReplayEngine,
  type ReplayOptions,
  type ReplayResult,
  type ReplayDayResult,
  type ReplayMode,
} from './replay-engine';

export {
  PipelineInspector,
  type ObservationTrace,
  type DayTrace,
  type FeatureSetTrace,
  type Warning,
  type MissingInput,
} from './pipeline-inspector';

export {
  FeatureExplorer,
  type DayExplorerView,
  type FeatureSetView,
  type HistoryView,
  type HistoryPoint,
  type RangeSummary,
} from './feature-explorer';
