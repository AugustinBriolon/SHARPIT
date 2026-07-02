/**
 * SHARPIT — Benchmark CLI Runner
 *
 * Run the full benchmark suite from the command line and print a detailed report.
 *
 * Usage:
 *   npx tsx src/core/benchmarks/cli.ts
 *   npx tsx src/core/benchmarks/cli.ts --json         (JSON output)
 *   npx tsx src/core/benchmarks/cli.ts --compact      (one-line summary)
 *
 * Exit codes:
 *   0 — All scenarios passed (score = 100)
 *   1 — One or more scenarios failed
 *   2 — Safety-critical expectation failed (deployment-blocking)
 */

import { runRecoveryModel } from '@/core/inference/recovery/model';
import { runBenchmark, compareModels, BENCHMARK_SCENARIOS } from './index';
import {
  formatBenchmarkReport,
  formatModelComparison,
  formatCompactSummary,
  serializeReport,
} from './report';
import type { ModelDescriptor } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Model registry — add new model versions here when available
// ─────────────────────────────────────────────────────────────────────────────

const MODELS: Record<string, ModelDescriptor> = {
  v1: {
    id: 'recovery-synthesis',
    version: 'v1',
    description: 'Recovery Synthesis Model v1 — current production implementation',
    run: runRecoveryModel,
  },
  // v2: {
  //   id: 'recovery-synthesis',
  //   version: 'v2',
  //   description: 'Recovery Synthesis Model v2 — experimental',
  //   run: runRecoveryModelV2,
  // },
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const modelArgs = args.filter((a) => !a.startsWith('--'));

  // Determine which models to run
  const modelKeys = modelArgs.length > 0 ? modelArgs.filter((k) => k in MODELS) : ['v1'];

  if (modelKeys.length === 0) {
    console.error(`Unknown model(s): ${modelArgs.join(', ')}`);
    console.error(`Available: ${Object.keys(MODELS).join(', ')}`);
    process.exit(1);
  }

  // Run benchmarks
  const reports = modelKeys.map((key) => runBenchmark(MODELS[key]!, BENCHMARK_SCENARIOS));

  // Output format
  if (flags.has('--json')) {
    const output =
      reports.length === 1 ? serializeReport(reports[0]!) : reports.map(serializeReport);
    console.log(JSON.stringify(output, null, 2));
  } else if (flags.has('--compact')) {
    for (const report of reports) {
      console.log(formatCompactSummary(report));
    }
  } else {
    for (const report of reports) {
      console.log(formatBenchmarkReport(report));
    }

    // If multiple models, show comparison
    if (reports.length === 2) {
      console.log('\n');
      const comparison = compareModels(reports[0]!, reports[1]!);
      console.log(formatModelComparison(comparison));
    }
  }

  // Exit code
  const allPassed = reports.every((r) => r.metrics.scientificRegressionScore === 100);
  const hasSafetyFailure = reports.some((r) => r.metrics.safetyScore < 1.0);

  if (hasSafetyFailure) {
    process.exit(2);
  } else if (!allPassed) {
    process.exit(1);
  }
}

main();
