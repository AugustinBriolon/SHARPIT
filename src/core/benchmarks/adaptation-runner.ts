/**
 * ADAPTATION BENCHMARK RUNNER
 *
 * Evaluates the Adaptation Model against the scientific benchmark scenarios.
 * Produces an AdaptationBenchmarkReport after each run.
 *
 * This module mirrors the fatigue benchmark runner architecture.
 */

import { runAdaptationModel } from '@/core/inference/adaptation/model';
import type { AdaptationModelOutput } from '@/core/inference/adaptation/types';
import type {
  AdaptationBenchmarkScenario,
  AdaptationPhysiologicalExpectations,
} from './adaptation-scenarios';
import type { ValueExpectation, RangeExpectation } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationExpectationResult = {
  readonly expectationId: string;
  readonly label: string;
  readonly weight: number;
  readonly met: boolean;
  readonly expected: string;
  readonly actual: string;
};

export type AdaptationScenarioResult = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly passed: boolean;
  readonly passRate: number;
  readonly weightedPassRate: number;
  readonly expectations: readonly AdaptationExpectationResult[];
  readonly output: AdaptationModelOutput;
};

export type AdaptationBenchmarkMetrics = {
  readonly passRate: number;
  readonly scenarioPassRate: number;
  readonly weightedPassRate: number;
  readonly safetyScore: number;
  readonly scientificRegressionScore: number;
};

export type AdaptationBenchmarkReport = {
  readonly modelId: 'adaptation-v1';
  readonly modelVersion: string;
  readonly executedAt: Date;
  readonly durationMs: number;
  readonly totalScenarios: number;
  readonly metrics: AdaptationBenchmarkMetrics;
  readonly scenarios: readonly AdaptationScenarioResult[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation helpers
// ─────────────────────────────────────────────────────────────────────────────

function evaluateValue<T>(
  id: string,
  exp: ValueExpectation<T>,
  actual: T,
): AdaptationExpectationResult {
  const met = exp.acceptable.includes(actual);
  return {
    expectationId: id,
    label: exp.rationale,
    weight: exp.weight,
    met,
    expected: exp.acceptable.join(' | '),
    actual: String(actual),
  };
}

function evaluateRange(
  id: string,
  exp: RangeExpectation,
  actual: number,
): AdaptationExpectationResult {
  const met = actual >= exp.min && actual <= exp.max;
  return {
    expectationId: id,
    label: exp.rationale,
    weight: exp.weight,
    met,
    expected: `[${exp.min}, ${exp.max}]`,
    actual: String(actual),
  };
}

function evaluateExpectations(
  exp: AdaptationPhysiologicalExpectations,
  output: AdaptationModelOutput,
): readonly AdaptationExpectationResult[] {
  const results: AdaptationExpectationResult[] = [];
  const { adaptationState, signals, decision } = output;

  results.push(
    evaluateValue('adaptationStatus', exp.adaptationStatus, adaptationState.adaptationStatus),
  );
  results.push(evaluateValue('verdict', exp.verdict, decision.verdict));
  results.push(evaluateRange('confidenceRange', exp.confidenceRange, adaptationState.confidence));

  if (adaptationState.adaptationIndex !== null) {
    results.push(
      evaluateRange(
        'adaptationIndexRange',
        exp.adaptationIndexRange,
        adaptationState.adaptationIndex,
      ),
    );
  }

  if (exp.overreachingWithoutAdaptationDetected) {
    results.push(
      evaluateValue(
        'overreachingWithoutAdaptationDetected',
        exp.overreachingWithoutAdaptationDetected,
        signals.overreachingWithoutAdaptationDetected,
      ),
    );
  }

  if (exp.plateauRisk) {
    results.push(evaluateValue('plateauRisk', exp.plateauRisk, signals.plateauRisk));
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics computation
// ─────────────────────────────────────────────────────────────────────────────

function computeMetrics(
  scenarios: readonly AdaptationScenarioResult[],
): AdaptationBenchmarkMetrics {
  if (scenarios.length === 0) {
    return {
      passRate: 0,
      scenarioPassRate: 0,
      weightedPassRate: 0,
      safetyScore: 0,
      scientificRegressionScore: 0,
    };
  }

  const allExpectations = scenarios.flatMap((s) => s.expectations);

  const passRate = allExpectations.filter((e) => e.met).length / allExpectations.length;

  const scenarioPassRate = scenarios.filter((s) => s.passed).length / scenarios.length;

  const totalWeight = allExpectations.reduce((s, e) => s + e.weight, 0);
  const weightedPassRate =
    allExpectations.reduce((s, e) => s + (e.met ? e.weight : 0), 0) / totalWeight;

  const safetyExpectations = allExpectations.filter((e) => e.weight >= 3.0);
  const safetyScore =
    safetyExpectations.length > 0
      ? safetyExpectations.filter((e) => e.met).length / safetyExpectations.length
      : 1.0;

  const scientificRegressionScore = Math.round((weightedPassRate * 0.7 + safetyScore * 0.3) * 100);

  return { passRate, scenarioPassRate, weightedPassRate, safetyScore, scientificRegressionScore };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function runAdaptationBenchmark(
  scenarios: readonly AdaptationBenchmarkScenario[],
  modelVersion = 'v1',
): AdaptationBenchmarkReport {
  const start = Date.now();
  const executedAt = new Date();

  const scenarioResults: AdaptationScenarioResult[] = scenarios.map((scenario) => {
    const output = runAdaptationModel(scenario.features, scenario.context);
    const expectations = evaluateExpectations(scenario.expectations, output);

    const metCount = expectations.filter((e) => e.met).length;
    const passRate = expectations.length > 0 ? metCount / expectations.length : 1;
    const totalWeight = expectations.reduce((s, e) => s + e.weight, 0);
    const weightedPassRate =
      totalWeight > 0
        ? expectations.reduce((s, e) => s + (e.met ? e.weight : 0), 0) / totalWeight
        : 1;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: expectations.every((e) => e.met),
      passRate,
      weightedPassRate,
      expectations,
      output,
    };
  });

  const metrics = computeMetrics(scenarioResults);

  return {
    modelId: 'adaptation-v1',
    modelVersion,
    executedAt,
    durationMs: Date.now() - start,
    totalScenarios: scenarios.length,
    metrics,
    scenarios: scenarioResults,
  };
}
