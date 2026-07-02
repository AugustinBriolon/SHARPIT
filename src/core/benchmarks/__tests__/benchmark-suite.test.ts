/**
 * SHARPIT — Scientific Benchmark Suite (Vitest Integration)
 *
 * This file integrates the benchmark framework into the standard Vitest CI pipeline.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * IMPORTANT: Relationship to unit tests
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Unit tests (src/core/inference/recovery/__tests__/model.test.ts):
 *   → Software correctness: boundary values, algorithmic invariants, edge cases
 *   → Fast: individual function isolation
 *   → Fail on bugs
 *
 * THIS FILE — Scientific Benchmark Suite:
 *   → Scientific correctness: realistic athlete scenarios, physiological expectations
 *   → Full pipeline: model output evaluated against documented expectations
 *   → Fail on physiological regressions, even if all unit tests still pass
 *
 * Both must pass for a model change to be considered safe.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * Running standalone (with report):
 *   npx tsx src/core/benchmarks/cli.ts
 *
 * Running via Vitest:
 *   npx vitest run src/core/benchmarks
 * ════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runRecoveryModel } from '@/core/inference/recovery/model';
import { runBenchmark, BENCHMARK_SCENARIOS } from '../index';
import { formatBenchmarkReport, formatCompactSummary } from '../report';
import type { BenchmarkReport } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Model registration
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_MODEL = {
  id: 'recovery-synthesis',
  version: 'v1',
  description: 'Recovery Synthesis Model v1 — initial implementation',
  run: runRecoveryModel,
};

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark execution (runs once for all tests below)
// ─────────────────────────────────────────────────────────────────────────────

let report: BenchmarkReport;

beforeAll(() => {
  report = runBenchmark(CURRENT_MODEL, BENCHMARK_SCENARIOS);
  // Print the full report to the test output for visibility
  console.log('\n' + formatBenchmarkReport(report));
  console.log('\nCompact summary:', formatCompactSummary(report));
});

// ─────────────────────────────────────────────────────────────────────────────
// Deployment gate tests
// These are the tests that BLOCK deployment if they fail.
// ─────────────────────────────────────────────────────────────────────────────

describe('Deployment gate — scientific regression score', () => {
  it('scientific regression score must be 100/100', () => {
    expect(report.metrics.scientificRegressionScore).toBe(100);
  });

  it('all scenarios must pass', () => {
    const failed = report.scenarios.filter((s) => !s.passed);
    const failMessages = failed
      .map((s) => {
        const failedExps = s.expectations.filter((e) => !e.met);
        return `${s.scenarioId}: ${failedExps.map((e) => `${e.expectationId}(expected=${e.expected}, got=${e.actual})`).join(', ')}`;
      })
      .join('\n');
    expect(failed.length, `Failed scenarios:\n${failMessages}`).toBe(0);
  });
});

describe('Safety gate — critical expectations (weight ≥ 3.0)', () => {
  it('safety score must be 100%', () => {
    expect(report.metrics.safetyScore).toBe(1.0);
  });

  it('illness detection (S05) must produce illnessRisk=HIGH and REST recommendation', () => {
    const s05 = report.scenarios.find((s) => s.scenarioId === 'S05-ILLNESS-DETECTION');
    expect(s05).toBeDefined();
    expect(s05!.passed).toBe(true);
  });

  it('functional overreaching (S07) must produce overreachingRisk=HIGH', () => {
    const s07 = report.scenarios.find((s) => s.scenarioId === 'S07-FUNCTIONAL-OVERREACHING');
    expect(s07).toBeDefined();
    expect(s07!.passed).toBe(true);
  });

  it('cold start (S10) must produce confidence < 0.30', () => {
    const s10 = report.scenarios.find((s) => s.scenarioId === 'S10-COLD-START');
    expect(s10).toBeDefined();
    expect(s10!.passed).toBe(true);
  });
});

describe('Decision and recommendation consistency', () => {
  it('decision consistency must be 100%', () => {
    expect(report.metrics.decisionConsistency).toBe(1.0);
  });

  it('recommendation consistency must be 100%', () => {
    expect(report.metrics.recommendationConsistency).toBe(1.0);
  });
});

describe('Confidence calibration', () => {
  it('confidence calibration must be WELL_CALIBRATED', () => {
    expect(report.metrics.confidenceCalibration).toBe('WELL_CALIBRATED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-scenario pass verification (provides clear failure attribution)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario pass rates', () => {
  for (const scenario of BENCHMARK_SCENARIOS) {
    it(`${scenario.id} — ${scenario.name}`, () => {
      const result = report.scenarios.find((s) => s.scenarioId === scenario.id);
      expect(result).toBeDefined();

      const failedExps = result!.expectations.filter((e) => !e.met);
      const failDetail = failedExps
        .map((e) => `  ✗ ${e.expectationId}: expected ${e.expected}, got ${e.actual}`)
        .join('\n');

      expect(result!.passed, `Scenario ${scenario.id} failed:\n${failDetail}`).toBe(true);
    });
  }
});
