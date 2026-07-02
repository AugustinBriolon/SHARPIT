/**
 * ADAPTATION INTELLIGENCE — Benchmark Suite (CI gate)
 *
 * This test runs the full Adaptation benchmark suite and asserts deployment-gate
 * metrics. A failing test here indicates a scientific regression.
 *
 * Deployment gates:
 *   - Scientific regression score: 100/100
 *   - Safety score: 100% (all weight ≥ 3.0 expectations must pass)
 *   - All 5 scenarios must pass completely
 */

import { describe, it, expect } from 'vitest';
import { runAdaptationBenchmark } from '../adaptation-runner';
import { ADAPTATION_BENCHMARK_SCENARIOS } from '../adaptation-scenarios';

describe('Adaptation Intelligence v1 — Scientific Benchmark', () => {
  const report = runAdaptationBenchmark(ADAPTATION_BENCHMARK_SCENARIOS, 'v1');

  it('executed all 5 scenarios', () => {
    expect(report.totalScenarios).toBe(5);
    expect(report.scenarios).toHaveLength(5);
  });

  it('safety score is 100% — all safety-critical expectations passed', () => {
    expect(report.metrics.safetyScore).toBe(1.0);

    const failures = report.scenarios
      .flatMap((s) => s.expectations)
      .filter((e) => e.weight >= 3.0 && !e.met);

    if (failures.length > 0) {
      const msg = failures
        .map(
          (f) =>
            `  [FAIL weight=${f.weight}] ${f.expectationId}: expected ${f.expected}, got ${f.actual}`,
        )
        .join('\n');
      throw new Error(`Safety-critical expectations failed:\n${msg}`);
    }
  });

  it('scientific regression score is 100/100', () => {
    if (report.metrics.scientificRegressionScore < 100) {
      const failing = report.scenarios
        .filter((s) => !s.passed)
        .map((s) => {
          const details = s.expectations
            .filter((e) => !e.met)
            .map(
              (e) =>
                `    [w=${e.weight}] ${e.expectationId}: expected=${e.expected}, actual=${e.actual}`,
            )
            .join('\n');
          return `  SCENARIO ${s.scenarioId} (${s.scenarioName}):\n${details}`;
        })
        .join('\n');
      throw new Error(
        `Scientific regression score: ${report.metrics.scientificRegressionScore}/100 (expected 100)\n` +
          `Failing scenarios:\n${failing}`,
      );
    }
    expect(report.metrics.scientificRegressionScore).toBe(100);
  });

  it('all 5 scenarios pass individually', () => {
    for (const scenario of report.scenarios) {
      const failedExpectations = scenario.expectations.filter((e) => !e.met);
      if (failedExpectations.length > 0) {
        const msg = failedExpectations
          .map(
            (e) => `  [w=${e.weight}] ${e.expectationId}: expected=${e.expected}, got=${e.actual}`,
          )
          .join('\n');
        throw new Error(`Scenario ${scenario.scenarioId} failed:\n${msg}`);
      }
      expect(scenario.passed).toBe(true);
    }
  });

  it('confidence is well-calibrated for all scenarios', () => {
    for (const scenario of report.scenarios) {
      const confExp = scenario.expectations.find((e) => e.expectationId === 'confidenceRange');
      if (confExp) {
        expect(confExp.met).toBe(true);
      }
    }
  });
});
