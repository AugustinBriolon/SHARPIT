/**
 * REASONING ENGINE BENCHMARK RUNNER
 *
 * Evaluates the Reasoning Engine against the scientific benchmark scenarios.
 * Produces a ReasoningBenchmarkReport after each run.
 *
 * This module mirrors the adaptation benchmark runner architecture.
 */

import { runReasoningModel } from '@/core/inference/reasoning/model';
import type { ReasoningModelOutput } from '@/core/inference/reasoning/types';
import type {
  ReasoningBenchmarkScenario,
  ReasoningPhysiologicalExpectations,
} from './reasoning-scenarios';
import type { ValueExpectation, RangeExpectation } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningExpectationResult = {
  readonly expectationId: string;
  readonly label: string;
  readonly weight: number;
  readonly met: boolean;
  readonly expected: string;
  readonly actual: string;
};

export type ReasoningScenarioResult = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly passed: boolean;
  readonly passRate: number;
  readonly weightedPassRate: number;
  readonly expectations: readonly ReasoningExpectationResult[];
  readonly output: ReasoningModelOutput;
};

export type ReasoningBenchmarkMetrics = {
  readonly passRate: number;
  readonly scenarioPassRate: number;
  readonly weightedPassRate: number;
  readonly safetyScore: number;
  readonly scientificRegressionScore: number;
};

export type ReasoningBenchmarkReport = {
  readonly modelId: 'reasoning-v1';
  readonly modelVersion: string;
  readonly executedAt: Date;
  readonly durationMs: number;
  readonly totalScenarios: number;
  readonly metrics: ReasoningBenchmarkMetrics;
  readonly scenarios: readonly ReasoningScenarioResult[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation helpers
// ─────────────────────────────────────────────────────────────────────────────

function evaluateValue<T>(
  id: string,
  exp: ValueExpectation<T>,
  actual: T,
): ReasoningExpectationResult {
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
): ReasoningExpectationResult {
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
  exp: ReasoningPhysiologicalExpectations,
  output: ReasoningModelOutput,
): readonly ReasoningExpectationResult[] {
  const results: ReasoningExpectationResult[] = [];
  const { reasoningState, signals } = output;

  results.push(evaluateValue('overallVerdict', exp.overallVerdict, reasoningState.overallVerdict));
  results.push(
    evaluateValue(
      'physiologicalConsistency',
      exp.physiologicalConsistency,
      reasoningState.physiologicalConsistency,
    ),
  );
  results.push(
    evaluateRange(
      'consistencyScoreRange',
      exp.consistencyScoreRange,
      reasoningState.consistencyScore,
    ),
  );
  results.push(evaluateRange('confidenceRange', exp.confidenceRange, reasoningState.confidence));

  if (exp.hasConflicts !== undefined) {
    results.push(evaluateValue('hasConflicts', exp.hasConflicts, signals.conflictCount > 0));
  }

  if (exp.hasOpportunities !== undefined) {
    results.push(
      evaluateValue('hasOpportunities', exp.hasOpportunities, signals.opportunityCount > 0),
    );
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics computation
// ─────────────────────────────────────────────────────────────────────────────

function computeMetrics(scenarios: readonly ReasoningScenarioResult[]): ReasoningBenchmarkMetrics {
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

export function runReasoningBenchmark(
  scenarios: readonly ReasoningBenchmarkScenario[],
  modelVersion = 'v1',
): ReasoningBenchmarkReport {
  const start = Date.now();
  const executedAt = new Date();

  const scenarioResults: ReasoningScenarioResult[] = scenarios.map((scenario) => {
    const output = runReasoningModel(scenario.input);
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
    modelId: 'reasoning-v1',
    modelVersion,
    executedAt,
    durationMs: Date.now() - start,
    totalScenarios: scenarios.length,
    metrics,
    scenarios: scenarioResults,
  };
}
