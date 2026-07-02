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
function evaluateExpectations(
  expectations: PhysiologicalExpectations,
  output: RecoveryModelOutput,
): readonly ExpectationResult[] {
  const results: ExpectationResult[] = [];

  // Required expectations — always evaluated
  results.push(
    evaluateValue(
      'readinessCategory',
      expectations.readinessCategory,
      output.recoveryState.readinessCategory,
    ),
  );
  results.push(
    evaluateValue(
      'recommendedIntensity',
      expectations.recommendedIntensity,
      output.recommendation.type,
    ),
  );
  results.push(evaluateValue('verdict', expectations.verdict, output.decision.verdict));
  results.push(
    evaluateRange('confidence', expectations.confidenceRange, output.recoveryState.confidence),
  );

  // Optional expectations — evaluated when defined
  if (expectations.overreachingRisk !== undefined) {
    results.push(
      evaluateValue(
        'overreachingRisk',
        expectations.overreachingRisk,
        output.signals.overreachingRisk,
      ),
    );
  }
  if (expectations.illnessRisk !== undefined) {
    results.push(
      evaluateValue('illnessRisk', expectations.illnessRisk, output.signals.illnessRisk),
    );
  }
  if (expectations.primaryLimitingFactor !== undefined) {
    results.push(
      evaluateValue(
        'primaryLimitingFactor',
        expectations.primaryLimitingFactor,
        output.recoveryState.primaryLimitingFactor as string | null,
      ),
    );
  }
  if (expectations.autonomicBalance !== undefined) {
    results.push(
      evaluateValue(
        'autonomicBalance',
        expectations.autonomicBalance,
        output.signals.autonomicBalance,
      ),
    );
  }
  if (expectations.sleepAdequacy !== undefined) {
    results.push(
      evaluateValue('sleepAdequacy', expectations.sleepAdequacy, output.signals.sleepAdequacy),
    );
  }
  if (expectations.dissonanceDetected !== undefined) {
    results.push(
      evaluateValue(
        'dissonanceDetected',
        expectations.dissonanceDetected,
        output.signals.dissonanceDetected,
      ),
    );
  }
  if (
    expectations.readinessScoreRange !== undefined &&
    output.recoveryState.readinessScore !== null
  ) {
    results.push(
      evaluateRange(
        'readinessScore',
        expectations.readinessScoreRange,
        output.recoveryState.readinessScore,
      ),
    );
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics computation
// ─────────────────────────────────────────────────────────────────────────────

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
  const confidenceCalibration: ConfidenceCalibration =
    confidenceExps.length < 3
      ? 'INSUFFICIENT_DATA'
      : confidenceExps.filter((e) => e.met).length / confidenceExps.length >= 0.8
        ? 'WELL_CALIBRATED'
        : 'MISCALIBRATED';

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
    if (!baselineScenario) continue;

    for (const candidateExp of candidateScenario.expectations) {
      const baselineExp = baselineScenario.expectations.find(
        (e) => e.expectationId === candidateExp.expectationId,
      );
      if (!baselineExp) continue;

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
      } else if (!baselineExp.met && candidateExp.met) {
        improvements.push({
          scenarioId: candidateScenario.scenarioId,
          scenarioName: candidateScenario.scenarioName,
          expectationId: candidateExp.expectationId,
          expectationLabel: candidateExp.label,
        });
      }
    }
  }

  const hasSafetyRegression = regressions.some((r) => r.isSafetyCritical);
  const verdict: ModelComparison['verdict'] =
    regressions.length === 0 ? 'DEPLOY' : hasSafetyRegression ? 'REJECT' : 'INVESTIGATE';

  const deltaScore =
    candidate.metrics.scientificRegressionScore - baseline.metrics.scientificRegressionScore;

  const summary =
    verdict === 'DEPLOY'
      ? `No regressions detected. Candidate (${candidate.modelVersion}) is safe to deploy. ` +
        `Score: ${candidate.metrics.scientificRegressionScore}/100 ` +
        `(${deltaScore >= 0 ? '+' : ''}${deltaScore} vs baseline).`
      : verdict === 'REJECT'
        ? `DEPLOYMENT BLOCKED. ${regressions.filter((r) => r.isSafetyCritical).length} safety-critical ` +
          `regression(s) detected in candidate ${candidate.modelVersion}.`
        : `${regressions.length} regression(s) require investigation before deploying ${candidate.modelVersion}.`;

  return {
    baseline,
    candidate,
    regressions,
    improvements,
    verdict,
    summary,
  };
}
