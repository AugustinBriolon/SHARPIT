'use client';

import { useToday } from '@/hooks/use-today';
import { VerdictZone } from './verdict-zone';
import { StateSummaryZone } from './state-summary-zone';
import { DecisionZone } from './decision-zone';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function TodaySkeleton() {
  return (
    <div aria-label="Loading today's assessment" className="animate-pulse space-y-4" aria-busy>
      <div className="bg-card/40 space-y-3 rounded-2xl border px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-3 w-3 rounded-full" />
          <div className="bg-muted h-6 w-32 rounded" />
        </div>
        <div className="bg-muted h-4 w-3/4 rounded" />
        <div className="bg-muted h-3 w-24 rounded" />
      </div>

      <div className="space-y-2">
        <div className="bg-muted h-3 w-24 rounded" />
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card/40 flex-1 space-y-2 rounded-xl border px-4 py-4">
              <div className="bg-muted h-2 w-16 rounded" />
              <div className="bg-muted h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-muted h-3 w-32 rounded" />
        <div className="bg-card/40 space-y-3 rounded-2xl border px-5 py-5">
          <div className="bg-muted h-6 w-48 rounded" />
          <div className="bg-muted h-4 w-full rounded" />
          <div className="flex gap-2">
            <div className="bg-muted h-8 w-24 rounded-lg" />
            <div className="bg-muted h-8 w-36 rounded-lg" />
            <div className="bg-muted ml-auto h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────

function TodayError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-7 text-center">
      <p className="text-sm font-medium">{message}</p>
      <button
        className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insufficient data state
// ─────────────────────────────────────────────────────────────────────────────

function InsufficientDataState() {
  return (
    <div className="bg-card/30 space-y-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <p className="font-medium">Building your model</p>
      <p className="text-muted-foreground text-sm">
        Log at least 7 days of training to unlock your Daily Brief.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Today View
// ─────────────────────────────────────────────────────────────────────────────

export function TodayView() {
  const { data, loading, error, refresh } = useToday();

  if (loading) return <TodaySkeleton />;

  if (error) return <TodayError message={error} onRetry={refresh} />;

  const { reasoning, recovery, fatigue, adaptation } = data;

  if (!reasoning || reasoning.overallVerdict === 'INSUFFICIENT_DATA') {
    return <InsufficientDataState />;
  }

  return (
    <div className="space-y-4">
      {/* Zone A — Verdict */}
      <VerdictZone
        computedAt={reasoning.computedAt}
        confidence={reasoning.confidence}
        explanation={reasoning.explanation}
        keyFindings={reasoning.keyFindings}
        topAction={reasoning.topAction}
        verdict={reasoning.overallVerdict}
      />

      {/* Zone B — State Summary */}
      <StateSummaryZone adaptation={adaptation} fatigue={fatigue} recovery={recovery} />

      {/* Zone C — Decision (only when topAction available) */}
      {reasoning.topAction && (
        <DecisionZone
          explanation={reasoning.explanation}
          keyFindings={reasoning.keyFindings}
          limitingFactor={reasoning.limitingFactor}
          topAction={reasoning.topAction}
        />
      )}

      {/* Pull-to-refresh hint */}
      <p className="text-muted-foreground pt-2 text-center text-xs">
        <button className="underline-offset-2 hover:underline" type="button" onClick={refresh}>
          Refresh assessment
        </button>
      </p>
    </div>
  );
}
