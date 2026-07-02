/**
 * DEVELOPER PLATFORM — Engine Metrics
 *
 * Lightweight in-process metrics for the Feature Extraction Layer.
 * Observable without external dependencies — no Datadog, no Prometheus.
 * Designed for local observability; can be extended to push to an external
 * collector in the future.
 *
 * Architecture note:
 *   MetricsCollector is a Port (interface). EngineMetricsCollector is the
 *   in-process Adapter. The FeatureEngine depends only on the Port.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export type ExtractionCategory = 'SESSION' | 'LOAD' | 'RECOVERY' | 'BODY' | 'CONDITION';

export type ExtractionEvent = {
  readonly category: ExtractionCategory;
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly sessionObsId?: string;
  readonly durationMs: number;
  readonly success: boolean;
  readonly confidence?: number;
  readonly missingInputs?: readonly string[];
};

export type ReplayEvent = {
  readonly athleteId: string;
  readonly daysReplayed: number;
  readonly totalDurationMs: number;
  readonly success: boolean;
};

export type LatencyStats = {
  readonly count: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly avgMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
};

export type MetricsSnapshot = {
  readonly capturedAt: Date;
  readonly observations: {
    readonly processed: number;
  };
  readonly extractions: {
    readonly total: number;
    readonly byCategory: Record<ExtractionCategory, number>;
    readonly failed: number;
    readonly pendingInputWarnings: number;
  };
  readonly latency: {
    readonly perCategory: Partial<Record<ExtractionCategory, LatencyStats>>;
    readonly overall: LatencyStats | null;
  };
  readonly replays: {
    readonly total: number;
    readonly failed: number;
    readonly totalDays: number;
    readonly lastDurationMs: number | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Port
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricsCollector {
  recordObservationIngested(): void;
  recordExtraction(event: ExtractionEvent): void;
  recordReplay(event: ReplayEvent): void;
  snapshot(): MetricsSnapshot;
  reset(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-process adapter
// ─────────────────────────────────────────────────────────────────────────────

function computeLatencyStats(samples: number[]): LatencyStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);

  return {
    count: n,
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    avgMs: Math.round(sum / n),
    p50Ms: sorted[Math.floor(n * 0.5)] ?? sorted[n - 1],
    p95Ms: sorted[Math.floor(n * 0.95)] ?? sorted[n - 1],
    p99Ms: sorted[Math.floor(n * 0.99)] ?? sorted[n - 1],
  };
}

export class EngineMetricsCollector implements MetricsCollector {
  private observationsProcessed = 0;

  private extractionTotal = 0;
  private extractionFailed = 0;
  private pendingInputWarnings = 0;
  private extractionByCategory: Record<ExtractionCategory, number> = {
    SESSION: 0,
    LOAD: 0,
    RECOVERY: 0,
    BODY: 0,
    CONDITION: 0,
  };
  private latencyByCategory: Record<ExtractionCategory, number[]> = {
    SESSION: [],
    LOAD: [],
    RECOVERY: [],
    BODY: [],
    CONDITION: [],
  };
  private allLatencies: number[] = [];

  private replayTotal = 0;
  private replayFailed = 0;
  private replayTotalDays = 0;
  private lastReplayDurationMs: number | null = null;

  recordObservationIngested(): void {
    this.observationsProcessed++;
  }

  recordExtraction(event: ExtractionEvent): void {
    this.extractionTotal++;
    this.extractionByCategory[event.category]++;
    this.allLatencies.push(event.durationMs);
    this.latencyByCategory[event.category].push(event.durationMs);

    if (!event.success) {
      this.extractionFailed++;
    }

    if (event.missingInputs && event.missingInputs.length > 0) {
      this.pendingInputWarnings++;
    }
  }

  recordReplay(event: ReplayEvent): void {
    this.replayTotal++;
    if (!event.success) this.replayFailed++;
    this.replayTotalDays += event.daysReplayed;
    this.lastReplayDurationMs = event.totalDurationMs;
  }

  snapshot(): MetricsSnapshot {
    const perCategory: Partial<Record<ExtractionCategory, LatencyStats>> = {};
    for (const cat of Object.keys(this.latencyByCategory) as ExtractionCategory[]) {
      const stats = computeLatencyStats(this.latencyByCategory[cat]);
      if (stats) perCategory[cat] = stats;
    }

    return {
      capturedAt: new Date(),
      observations: {
        processed: this.observationsProcessed,
      },
      extractions: {
        total: this.extractionTotal,
        byCategory: { ...this.extractionByCategory },
        failed: this.extractionFailed,
        pendingInputWarnings: this.pendingInputWarnings,
      },
      latency: {
        perCategory,
        overall: computeLatencyStats(this.allLatencies),
      },
      replays: {
        total: this.replayTotal,
        failed: this.replayFailed,
        totalDays: this.replayTotalDays,
        lastDurationMs: this.lastReplayDurationMs,
      },
    };
  }

  reset(): void {
    this.observationsProcessed = 0;
    this.extractionTotal = 0;
    this.extractionFailed = 0;
    this.pendingInputWarnings = 0;
    this.extractionByCategory = { SESSION: 0, LOAD: 0, RECOVERY: 0, BODY: 0, CONDITION: 0 };
    this.latencyByCategory = { SESSION: [], LOAD: [], RECOVERY: [], BODY: [], CONDITION: [] };
    this.allLatencies = [];
    this.replayTotal = 0;
    this.replayFailed = 0;
    this.replayTotalDays = 0;
    this.lastReplayDurationMs = null;
  }
}

// Global singleton for the production engine
export const globalMetrics = new EngineMetricsCollector();
