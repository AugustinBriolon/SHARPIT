/**
 * SHARPIT — Scientific Benchmark Runner
 *
 * Evaluates any inference model against the canonical benchmark scenarios.
 *
 * Architecture:
 *   - `evaluateExpectations()` — maps model output to pass/fail per expectation
 *   - `runBenchmark()` — runs all scenarios through a model, returns BenchmarkReport
 *   - `compareModels()` — side-by-side comparison, computes regressions and improvements
 *
 * The runner is model-agnostic: pass any ModelDescriptor to evaluate.
 * This mirrors ML evaluation pipelines where you swap model weights and run
 * the same eval suite.
 */

import type {
  ModelDescriptor,
  BenchmarkScenario,
  BenchmarkReport,
  BenchmarkMetrics,
  ScenarioResult,
  ExpectationResult,
  PhysiologicalExpectations,
  ValueExpectation,
  RangeExpectation,
  RecoveryModelOutput,
  ConfidenceCalibration,
  ModelComparison,
  BenchmarkRegression,
  BenchmarkImprovement,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Expectation evaluation
// ─────────────────────────────────────────────────────────────────────────────

function evaluateValue<T>(
  id: string,
  expectation: ValueExpectation<T>,
  actual: T,
): ExpectationResult {
  const acceptable = expectation.acceptable as T[];
  const met = acceptable.includes(actual);
  const expected =
    acceptable.length === 1
      ? String(acceptable[0])
      : `one of [${acceptable.map(String).join(', ')}]`;

  return {
    expectationId: id,
    label: expectation.rationale,
    weight: expectation.weight,
    met,
    expected,
    actual: String(actual),
  };
}

function evaluateRange(
  id: string,
  expectation: RangeExpectation,
  actual: number,
): ExpectationResult {
  const met = actual >= expectation.min && actual <= expectation.max;
  return {
    expectationId: id,
    label: expectation.rationale,
    weight: expectation.weight,
    met,
    expected: `[${expectation.min}, ${expectation.max}]`,
    actual: actual.toFixed(3),
  };
}

/**
 * Evaluate all defined expectations for a scenario against one model output.
 * Only defined (non-undefined) expectations are evaluated.
 */
function requiredExpectationResults(
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
): ExpectationResult[] {
  return [
    evaluateValue(
      'readinessCategory',
      expectations.readinessCategory,
      output.recoveryState.readinessCategory,
    ),
    evaluateValue(
      'recommendedIntensity',
      expectations.recommendedIntensity,
      output.recommendation.type,
    ),
    evaluateValue('verdict', expectations.verdict, output.decision.verdict),
    evaluateRange('confidence', expectations.confidenceRange, output.recoveryState.confidence),
  ];
}

type OptionalExpectationKey =
  | 'overreachingRisk'
  | 'illnessRisk'
  | 'primaryLimitingFactor'
  | 'autonomicBalance'
  | 'sleepAdequacy'
  | 'dissonanceDetected'
  | 'readinessScoreRange';

type OptionalExpectationEvaluator = (
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
) => ExpectationResult | null;

const OPTIONAL_EXPECTATION_EVALUATORS: Record<
  OptionalExpectationKey,
  OptionalExpectationEvaluator
> = {
  overreachingRisk: (expectations, output) =>
    expectations.overreachingRisk !== undefined
      ? evaluateValue(
          'overreachingRisk',
          expectations.overreachingRisk,
          output.signals.overreachingRisk,
        )
      : null,
  illnessRisk: (expectations, output) =>
    expectations.illnessRisk !== undefined
      ? evaluateValue('illnessRisk', expectations.illnessRisk, output.signals.illnessRisk)
      : null,
  primaryLimitingFactor: (expectations, output) =>
    expectations.primaryLimitingFactor !== undefined
      ? evaluateValue(
          'primaryLimitingFactor',
          expectations.primaryLimitingFactor,
          output.recoveryState.primaryLimitingFactor as string | null,
        )
      : null,
  autonomicBalance: (expectations, output) =>
    expectations.autonomicBalance !== undefined
      ? evaluateValue(
          'autonomicBalance',
          expectations.autonomicBalance,
          output.signals.autonomicBalance,
        )
      : null,
  sleepAdequacy: (expectations, output) =>
    expectations.sleepAdequacy !== undefined
      ? evaluateValue('sleepAdequacy', expectations.sleepAdequacy, output.signals.sleepAdequacy)
      : null,
  dissonanceDetected: (expectations, output) =>
    expectations.dissonanceDetected !== undefined
      ? evaluateValue(
          'dissonanceDetected',
          expectations.dissonanceDetected,
          output.signals.dissonanceDetected,
        )
      : null,
  readinessScoreRange: (expectations, output) =>
    expectations.readinessScoreRange !== undefined && output.recoveryState.readinessScore !== null
      ? evaluateRange(
          'readinessScore',
          expectations.readinessScoreRange,
          output.recoveryState.readinessScore,
        )
      : null,
};

function optionalExpectation(
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
  key: OptionalExpectationKey,
): ExpectationResult | null {
  return OPTIONAL_EXPECTATION_EVALUATORS[key](expectations, output);
}

function optionalExpectationResults(
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
): ExpectationResult[] {
  const keys: OptionalExpectationKey[] = [
    'overreachingRisk',
    'illnessRisk',
    'primaryLimitingFactor',
    'autonomicBalance',
    'sleepAdequacy',
    'dissonanceDetected',
    'readinessScoreRange',
  ];

  return keys
    .map((key) => optionalExpectation(expectations, output, key))
    .filter((result): result is ExpectationResult => result !== null);
}

function evaluateExpectations(
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
): readonly ExpectationResult[] {
  return [
    ...requiredExpectationResults(expectations, output),
    ...optionalExpectationResults(expectations, output),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics computation
// ─────────────────────────────────────────────────────────────────────────────

function classifyConfidenceCalibration(
  confidenceExps: readonly ExpectationResult[],
): ConfidenceCalibration {
  if (confidenceExps.length < 3) {
    return 'INSUFFICIENT_DATA';
  }
  const passRate = confidenceExps.filter((e) => e.met).length / confidenceExps.length;
  return passRate >= 0.8 ? 'WELL_CALIBRATED' : 'MISCALIBRATED';
}

function comparisonVerdict(
  regressions: readonly BenchmarkRegression[],
): ModelComparison['verdict'] {
  if (regressions.length === 0) {
    return 'DEPLOY';
  }
  if (regressions.some((r) => r.isSafetyCritical)) {
    return 'REJECT';
  }
  return 'INVESTIGATE';
}

function comparisonSummary(
  verdict: ModelComparison['verdict'],
  regressions: readonly BenchmarkRegression[],
  candidate: BenchmarkReport,
  deltaScore: number,
): string {
  if (verdict === 'DEPLOY') {
    return (
      `No regressions detected. Candidate (${candidate.modelVersion}) is safe to deploy. ` +
      `Score: ${candidate.metrics.scientificRegressionScore}/100 ` +
      `(${deltaScore >= 0 ? '+' : ''}${deltaScore} vs baseline).`
    );
  }
  if (verdict === 'REJECT') {
    const safetyCount = regressions.filter((r) => r.isSafetyCritical).length;
    return (
      `DEPLOYMENT BLOCKED. ${safetyCount} safety-critical ` +
      `regression(s) detected in candidate ${candidate.modelVersion}.`
    );
  }
  return `${regressions.length} regression(s) require investigation before deploying ${candidate.modelVersion}.`;
}

function computeMetrics(results: readonly ScenarioResult[]): BenchmarkMetrics {
  const all = results.flatMap((r) => r.expectations);

  // Pass rate (unweighted)
  const passRate = all.length > 0 ? all.filter((e) => e.met).length / all.length : 0;

  // Scenario pass rate
  const scenarioPassRate =
    results.length > 0 ? results.filter((r) => r.passed).length / results.length : 0;

  // Weighted pass rate
  const totalWeight = all.reduce((s, e) => s + e.weight, 0);
  const metWeight = all.filter((e) => e.met).reduce((s, e) => s + e.weight, 0);
  const weightedPassRate = totalWeight > 0 ? metWeight / totalWeight : 0;

  // Confidence calibration: proportion of confidence range expectations met
  const confidenceExps = all.filter((e) => e.expectationId === 'confidence');
  const confidenceCalibration = classifyConfidenceCalibration(confidenceExps);

  // Decision consistency: verdict + intensity
  const decisionExps = all.filter(
    (e) => e.expectationId === 'verdict' || e.expectationId === 'recommendedIntensity',
  );
  const decisionConsistency =
    decisionExps.length > 0 ? decisionExps.filter((e) => e.met).length / decisionExps.length : 0;

  // Recommendation consistency: intensity only
  const recExps = all.filter((e) => e.expectationId === 'recommendedIntensity');
  const recommendationConsistency =
    recExps.length > 0 ? recExps.filter((e) => e.met).length / recExps.length : 0;

  // Safety score: weight ≥ 3.0 expectations
  const safetyExps = all.filter((e) => e.weight >= 3.0);
  const safetyScore =
    safetyExps.length > 0 ? safetyExps.filter((e) => e.met).length / safetyExps.length : 1.0;

  // Scientific regression score [0–100]
  // Formula: weightedPassRate × 0.7 + safetyScore × 0.3, scaled to 100
  const scientificRegressionScore = Math.round((weightedPassRate * 0.7 + safetyScore * 0.3) * 100);

  return {
    passRate,
    scenarioPassRate,
    weightedPassRate,
    confidenceCalibration,
    decisionConsistency,
    recommendationConsistency,
    safetyScore,
    scientificRegressionScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all benchmark scenarios through the given model.
 *
 * @param model - The model to evaluate (any implementation of ModelDescriptor).
 * @param scenarios - The scenario registry to evaluate against.
 * @returns BenchmarkReport — serializable artifact for storage and comparison.
 *
 * @example
 * ```ts
 * import { runBenchmark } from '@/core/benchmarks'
 * import { BENCHMARK_SCENARIOS } from '@/core/benchmarks/scenarios'
 * import { runRecoveryModel } from '@/core/inference/recovery/model'
 *
 * const report = runBenchmark(
 *   { id: 'recovery-synthesis', version: 'v1', run: runRecoveryModel },
 *   BENCHMARK_SCENARIOS,
 * )
 * ```
 */
export function runBenchmark(
  model: ModelDescriptor,
  scenarios: readonly BenchmarkScenario[],
): BenchmarkReport {
  const startMs = Date.now();

  const scenarioResults: ScenarioResult[] = scenarios.map((scenario) => {
    const modelOutput = model.run(scenario.features, scenario.context);
    const expectations = evaluateExpectations(scenario.expectations, modelOutput);
    const passed = expectations.every((e) => e.met);

    const passRate =
      expectations.length > 0 ? expectations.filter((e) => e.met).length / expectations.length : 0;

    const totalWeight = expectations.reduce((s, e) => s + e.weight, 0);
    const metWeight = expectations.filter((e) => e.met).reduce((s, e) => s + e.weight, 0);
    const weightedPassRate = totalWeight > 0 ? metWeight / totalWeight : 0;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed,
      passRate,
      weightedPassRate,
      expectations,
      modelOutput,
    };
  });

  const durationMs = Date.now() - startMs;
  const metrics = computeMetrics(scenarioResults);

  return {
    modelId: model.id,
    modelVersion: model.version,
    executedAt: new Date(),
    durationMs,
    totalScenarios: scenarios.length,
    metrics,
    scenarios: scenarioResults,
  };
}

/**
 * Compare two benchmark reports (baseline vs. candidate model version).
 *
 * Identifies:
 *   - Regressions: expectations the baseline passed that the candidate failed.
 *   - Improvements: expectations the baseline failed that the candidate passed.
 *   - Verdict: DEPLOY / INVESTIGATE / REJECT
 *
 * The verdict is determined by:
 *   REJECT      → any safety-critical (weight ≥ 3.0) regression detected
 *   INVESTIGATE → non-critical regressions detected (requires manual review)
 *   DEPLOY      → no regressions (improvements are allowed)
 *
 * @example
 * ```ts
 * const v1Report = runBenchmark(modelV1, BENCHMARK_SCENARIOS)
 * const v2Report = runBenchmark(modelV2, BENCHMARK_SCENARIOS)
 * const comparison = compareModels(v1Report, v2Report)
 *
 * if (comparison.verdict === 'REJECT') {
 *   throw new Error('Model v2 introduced safety regressions')
 * }
 * ```
 */
function compareScenarioExpectations(
  baselineScenario: BenchmarkReport['scenarios'][number],
  candidateScenario: BenchmarkReport['scenarios'][number],
): {
  regressions: BenchmarkRegression[];
  improvements: BenchmarkImprovement[];
} {
  const regressions: BenchmarkRegression[] = [];
  const improvements: BenchmarkImprovement[] = [];

  for (const candidateExp of candidateScenario.expectations) {
    const baselineExp = baselineScenario.expectations.find(
      (e) => e.expectationId === candidateExp.expectationId,
    );
    if (!baselineExp) {
      continue;
    }

    if (baselineExp.met && !candidateExp.met) {
      regressions.push({
        scenarioId: candidateScenario.scenarioId,
        scenarioName: candidateScenario.scenarioName,
        expectationId: candidateExp.expectationId,
        expectationLabel: candidateExp.label,
        expectedValue: candidateExp.expected,
        baselineActual: baselineExp.actual,
        candidateActual: candidateExp.actual,
        isSafetyCritical: candidateExp.weight >= 3.0,
      });
      continue;
    }

    if (!baselineExp.met && candidateExp.met) {
      improvements.push({
        scenarioId: candidateScenario.scenarioId,
        scenarioName: candidateScenario.scenarioName,
        expectationId: candidateExp.expectationId,
        expectationLabel: candidateExp.label,
      });
    }
  }

  return { regressions, improvements };
}

export function compareModels(
  baseline: BenchmarkReport,
  candidate: BenchmarkReport,
): ModelComparison {
  const regressions: BenchmarkRegression[] = [];
  const improvements: BenchmarkImprovement[] = [];

  for (const candidateScenario of candidate.scenarios) {
    const baselineScenario = baseline.scenarios.find(
      (s) => s.scenarioId === candidateScenario.scenarioId,
    );
    if (!baselineScenario) {
      continue;
    }

    const comparison = compareScenarioExpectations(baselineScenario, candidateScenario);
    regressions.push(...comparison.regressions);
    improvements.push(...comparison.improvements);
  }

  const verdict = comparisonVerdict(regressions);
  const deltaScore =
    candidate.metrics.scientificRegressionScore - baseline.metrics.scientificRegressionScore;

  return {
    baseline,
    candidate,
    regressions,
    improvements,
    verdict,
    summary: comparisonSummary(verdict, regressions, candidate, deltaScore),
  };
}
