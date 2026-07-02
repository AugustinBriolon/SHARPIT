/**
 * SHARPIT — Scientific Benchmark Framework
 *
 * Public API for SHARPIT's inference model benchmarking system.
 *
 * Quick start:
 *
 * ```ts
 * import { runBenchmark, BENCHMARK_SCENARIOS } from '@/core/benchmarks'
 * import { runRecoveryModel } from '@/core/inference/recovery/model'
 * import { formatBenchmarkReport } from '@/core/benchmarks'
 *
 * const model = { id: 'recovery-synthesis', version: 'v1', run: runRecoveryModel }
 * const report = runBenchmark(model, BENCHMARK_SCENARIOS)
 * console.log(formatBenchmarkReport(report))
 * ```
 *
 * Multi-version comparison:
 *
 * ```ts
 * const v1 = runBenchmark({ id: 'recovery-synthesis', version: 'v1', run: runRecoveryModelV1 }, BENCHMARK_SCENARIOS)
 * const v2 = runBenchmark({ id: 'recovery-synthesis', version: 'v2', run: runRecoveryModelV2 }, BENCHMARK_SCENARIOS)
 * const comparison = compareModels(v1, v2)
 * console.log(formatModelComparison(comparison))
 * // comparison.verdict → 'DEPLOY' | 'INVESTIGATE' | 'REJECT'
 * ```
 */

export { runBenchmark, compareModels } from './runner';
export { BENCHMARK_SCENARIOS } from './scenarios';
export {
  formatBenchmarkReport,
  formatModelComparison,
  formatCompactSummary,
  serializeReport,
} from './report';
export type {
  ModelDescriptor,
  BenchmarkScenario,
  BenchmarkReport,
  BenchmarkMetrics,
  ModelComparison,
  PhysiologicalExpectations,
  AthleteProfile,
  LiteratureReference,
  ScenarioResult,
  ExpectationResult,
} from './types';
