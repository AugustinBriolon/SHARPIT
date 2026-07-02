/**
 * SHARPIT — Scientific Benchmark Report Formatter
 *
 * Produces a human-readable ASCII report from a BenchmarkReport or ModelComparison.
 * No external dependencies — pure string formatting.
 *
 * Usage:
 *   const report = runBenchmark(model, BENCHMARK_SCENARIOS)
 *   console.log(formatBenchmarkReport(report))
 *
 *   const comparison = compareModels(baseline, candidate)
 *   console.log(formatModelComparison(comparison))
 */

import type { BenchmarkReport, ScenarioResult, ModelComparison, BenchmarkMetrics } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

const W = 72; // total box width (content width = W, borders included)

function line(content: string): string {
  return `│ ${content.padEnd(W - 2)} │`;
}

function divider(): string {
  return `├${'─'.repeat(W)}┤`;
}

function top(): string {
  return `┌${'─'.repeat(W)}┐`;
}

function bottom(): string {
  return `└${'─'.repeat(W)}┘`;
}

function header(text: string): string {
  return line(text.toUpperCase());
}

function kv(label: string, value: string): string {
  const labelWidth = 38;
  return line(`${label.padEnd(labelWidth)}${value}`);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function score(value: number): string {
  const bar = '█'.repeat(Math.round(value / 10)) + '░'.repeat(10 - Math.round(value / 10));
  return `${String(value).padStart(3)}/100  ${bar}`;
}

function statusIcon(passed: boolean): string {
  return passed ? '✓' : '✗';
}

function scenarioLine(result: ScenarioResult): string {
  const icon = statusIcon(result.passed);
  const idPart = result.scenarioId.slice(0, 3); // 'S01', 'S02' etc.
  const namePart =
    result.scenarioName.length > 44
      ? result.scenarioName.slice(0, 41) + '...'
      : result.scenarioName;
  const rightPart = `${pct(result.passRate).padStart(5)}`;
  const content = `  ${icon}  ${idPart}  ${namePart}`;
  return line(`${content.padEnd(W - 2 - rightPart.length - 1)}${rightPart}`);
}

function failureLine(expectationId: string, expected: string, actual: string): string {
  const content = `         ✗ ${expectationId}: expected ${expected} — got ${actual}`;
  return line(content.length > W - 2 ? content.slice(0, W - 5) + '...' : content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main report formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a BenchmarkReport as a human-readable ASCII box.
 *
 * The `verbose` option (default true) prints per-scenario failure details.
 * Set to false for compact CI output.
 */
export function formatBenchmarkReport(report: BenchmarkReport, verbose = true): string {
  const { metrics: m } = report;
  const passedCount = report.scenarios.filter((s) => s.passed).length;
  const lines: string[] = [];

  lines.push(top());
  lines.push(line('  SHARPIT — Scientific Benchmark Report'));
  lines.push(
    line(
      `  ${report.modelId}  ·  ${report.modelVersion}  ·  ${report.executedAt.toISOString().slice(0, 19)}Z`,
    ),
  );
  lines.push(divider());
  lines.push(header('  Aggregate Metrics'));
  lines.push(divider());

  lines.push(kv('Scientific Regression Score', score(m.scientificRegressionScore)));
  lines.push(
    kv(
      'Scenario Pass Rate',
      `${pct(m.scenarioPassRate).padEnd(8)} (${passedCount}/${report.totalScenarios} scenarios)`,
    ),
  );
  lines.push(kv('Expectation Pass Rate (unweighted)', pct(m.passRate)));
  lines.push(kv('Weighted Pass Rate', pct(m.weightedPassRate)));
  lines.push(kv('Safety Score (weight ≥ 3.0)', pct(m.safetyScore)));
  lines.push(kv('Decision Consistency', pct(m.decisionConsistency)));
  lines.push(kv('Recommendation Consistency', pct(m.recommendationConsistency)));
  lines.push(kv('Confidence Calibration', m.confidenceCalibration));
  lines.push(kv('Duration', `${report.durationMs}ms`));

  lines.push(divider());
  lines.push(header('  Scenario Results'));
  lines.push(divider());

  for (const scenario of report.scenarios) {
    lines.push(scenarioLine(scenario));
    if (verbose && !scenario.passed) {
      for (const exp of scenario.expectations.filter((e) => !e.met)) {
        lines.push(failureLine(exp.expectationId, exp.expected, exp.actual));
      }
    }
  }

  lines.push(bottom());
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison report formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a ModelComparison as a human-readable ASCII box.
 *
 * Shows:
 *   - Score delta between baseline and candidate
 *   - Regressions with safety-critical indicators
 *   - Improvements
 *   - Deployment verdict
 */
export function formatModelComparison(comparison: ModelComparison): string {
  const { baseline, candidate, regressions, improvements, verdict } = comparison;
  const lines: string[] = [];
  const delta =
    candidate.metrics.scientificRegressionScore - baseline.metrics.scientificRegressionScore;
  const deltaStr = `${delta >= 0 ? '+' : ''}${delta}`;

  lines.push(top());
  lines.push(line('  SHARPIT — Model Comparison Report'));
  lines.push(line(`  ${candidate.executedAt.toISOString().slice(0, 19)}Z`));
  lines.push(divider());
  lines.push(header('  Model Scores'));
  lines.push(divider());
  lines.push(
    kv(`Baseline   (${baseline.modelVersion})`, score(baseline.metrics.scientificRegressionScore)),
  );
  lines.push(
    kv(
      `Candidate  (${candidate.modelVersion})`,
      score(candidate.metrics.scientificRegressionScore),
    ),
  );
  lines.push(kv('Score delta', `${deltaStr} points`));
  lines.push(divider());

  // Verdict
  const verdictSymbol = verdict === 'DEPLOY' ? '✓' : verdict === 'REJECT' ? '✗' : '⚠';
  lines.push(header(`  Verdict: ${verdictSymbol} ${verdict}`));
  lines.push(divider());
  lines.push(line(`  ${comparison.summary}`));

  // Regressions
  if (regressions.length > 0) {
    lines.push(divider());
    lines.push(header(`  Regressions (${regressions.length})`));
    lines.push(divider());
    for (const r of regressions) {
      const critical = r.isSafetyCritical ? ' [SAFETY-CRITICAL]' : '';
      lines.push(line(`  ✗  ${r.scenarioId}  ${r.expectationId}${critical}`));
      lines.push(line(`     baseline: ${r.baselineActual}  →  candidate: ${r.candidateActual}`));
      lines.push(line(`     expected: ${r.expectedValue}`));
    }
  }

  // Improvements
  if (improvements.length > 0) {
    lines.push(divider());
    lines.push(header(`  Improvements (${improvements.length})`));
    lines.push(divider());
    for (const imp of improvements) {
      lines.push(line(`  ✓  ${imp.scenarioId}  ${imp.expectationId}`));
    }
  }

  lines.push(bottom());
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact summary (for CI one-liner)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single-line summary suitable for CI logs, PR descriptions, or notifications.
 *
 * @example
 * "recovery-synthesis v1 | Score: 100/100 | 10/10 scenarios | Safety: 100% | 12ms"
 */
export function formatCompactSummary(report: BenchmarkReport): string {
  const { metrics: m } = report;
  const passedCount = report.scenarios.filter((s) => s.passed).length;
  return [
    `${report.modelId} ${report.modelVersion}`,
    `Score: ${m.scientificRegressionScore}/100`,
    `${passedCount}/${report.totalScenarios} scenarios`,
    `Safety: ${pct(m.safetyScore)}`,
    `Decision: ${pct(m.decisionConsistency)}`,
    `${report.durationMs}ms`,
  ].join(' | ');
}

/**
 * Build a structured JSON-serializable summary (for storage or dashboards).
 */
export function serializeReport(report: BenchmarkReport): object {
  return {
    modelId: report.modelId,
    modelVersion: report.modelVersion,
    executedAt: report.executedAt.toISOString(),
    durationMs: report.durationMs,
    totalScenarios: report.totalScenarios,
    metrics: report.metrics,
    scenarios: report.scenarios.map((s) => ({
      scenarioId: s.scenarioId,
      scenarioName: s.scenarioName,
      passed: s.passed,
      passRate: s.passRate,
      weightedPassRate: s.weightedPassRate,
      failedExpectations: s.expectations
        .filter((e) => !e.met)
        .map((e) => ({
          expectationId: e.expectationId,
          weight: e.weight,
          expected: e.expected,
          actual: e.actual,
        })),
    })),
  };
}
