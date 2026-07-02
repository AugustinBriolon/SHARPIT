/**
 * FATIGUE BENCHMARK RUNNER
 *
 * Evaluates the Fatigue Model against the scientific benchmark scenarios.
 * Produces a FatigueBenchmarkReport after each run.
 *
 * This module mirrors the recovery benchmark runner architecture.
 */

import { runFatigueModel } from '@/core/inference/fatigue/model';
import type { FatigueModelOutput } from '@/core/inference/fatigue/types';
import type {
  FatigueBenchmarkScenario,
  FatiguePhysiologicalExpectations,
} from './fatigue-scenarios';
import type { ValueExpectation, RangeExpectation, LiteratureReference } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueExpectationResult = {
  readonly expectationId: string;
  readonly label: string;
  readonly weight: number;
  readonly met: boolean;
  readonly expected: string;
  readonly actual: string;
};

export type FatigueScenarioResult = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly passed: boolean;
  readonly passRate: number;
  readonly weightedPassRate: number;
  readonly expectations: readonly FatigueExpectationResult[];
  readonly output: FatigueModelOutput;
};

export type FatigueBenchmarkMetrics = {
  readonly passRate: number;
  readonly scenarioPassRate: number;
  readonly weightedPassRate: number;
  readonly safetyScore: number;
  readonly scientificRegressionScore: number;
};

export type FatigueBenchmarkReport = {
  readonly modelId: 'fatigue-v1';
  readonly modelVersion: string;
  readonly executedAt: Date;
  readonly durationMs: number;
  readonly totalScenarios: number;
  readonly metrics: FatigueBenchmarkMetrics;
  readonly scenarios: readonly FatigueScenarioResult[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation helpers
// ─────────────────────────────────────────────────────────────────────────────

function evaluateValue<T>(
  id: string,
  exp: ValueExpectation<T>,
  actual: T,
): FatigueExpectationResult {
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
): FatigueExpectationResult {
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
  exp: FatiguePhysiologicalExpectations,
  output: FatigueModelOutput,
): readonly FatigueExpectationResult[] {
  const results: FatigueExpectationResult[] = [];
  const { fatigueState, signals, decision } = output;

  results.push(evaluateValue('fatigueLevel', exp.fatigueLevel, fatigueState.fatigueLevel));
  results.push(
    evaluateValue('trainingCapacity', exp.trainingCapacity, fatigueState.trainingCapacity),
  );
  results.push(evaluateValue('verdict', exp.verdict, decision.verdict));
  results.push(evaluateRange('confidenceRange', exp.confidenceRange, fatigueState.confidence));

  if (exp.fatigueType) {
    results.push(evaluateValue('fatigueType', exp.fatigueType, fatigueState.fatigueType));
  }
  if (exp.fatigueIndexRange && fatigueState.fatigueIndex !== null) {
    results.push(
      evaluateRange('fatigueIndexRange', exp.fatigueIndexRange, fatigueState.fatigueIndex),
    );
  }
  if (exp.functionalOverreachingRisk) {
    results.push(
      evaluateValue(
        'functionalOverreachingRisk',
        exp.functionalOverreachingRisk,
        fatigueState.functionalOverreachingRisk,
      ),
    );
  }
  if (exp.isAccumulating !== undefined) {
    results.push(evaluateValue('isAccumulating', exp.isAccumulating, signals.isAccumulating));
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics computation
// ─────────────────────────────────────────────────────────────────────────────

function computeMetrics(scenarios: readonly FatigueScenarioResult[]): FatigueBenchmarkMetrics {
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

export function runFatigueBenchmark(
  scenarios: readonly FatigueBenchmarkScenario[],
  modelVersion = 'v1',
): FatigueBenchmarkReport {
  const start = Date.now();
  const executedAt = new Date();

  const scenarioResults: FatigueScenarioResult[] = scenarios.map((scenario) => {
    const output = runFatigueModel(scenario.features, scenario.context);
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
    modelId: 'fatigue-v1',
    modelVersion,
    executedAt,
    durationMs: Date.now() - start,
    totalScenarios: scenarios.length,
    metrics,
    scenarios: scenarioResults,
  };
}
