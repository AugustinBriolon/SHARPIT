'use client';

import { useToday } from '@/hooks/use-today';
import { NarrativeHeader } from './narrative-header';
import { ReasoningBlock } from './reasoning-block';
import { SessionBlock } from './session-block';
import { ExpectedOutcomeBlock } from './expected-outcome-block';
import { BottleneckBlock } from './bottleneck-block';
import { ConfidenceBlock } from './confidence-block';
import { SupportingEvidenceBlock } from './supporting-evidence-block';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function TodaySkeleton() {
  return (
    <div aria-label="Loading today's assessment" className="animate-pulse space-y-4" aria-busy>
      <div className="bg-card/40 space-y-3 rounded-2xl border px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-2.5 w-2.5 rounded-full" />
          <div className="bg-muted h-3 w-20 rounded" />
        </div>
        <div className="bg-muted h-8 w-3/4 rounded" />
        <div className="bg-muted h-3 w-24 rounded" />
      </div>

      <div className="bg-card/40 space-y-3 rounded-2xl border px-5 py-5">
        <div className="bg-muted h-3 w-12 rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-3/4 rounded" />
      </div>

      <div className="bg-card/40 space-y-3 rounded-2xl border px-5 py-5">
        <div className="bg-muted h-3 w-20 rounded" />
        <div className="bg-muted h-4 w-1/2 rounded" />
        <div className="bg-muted h-4 w-full rounded" />
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

function InsufficientDataState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-card/30 space-y-3 rounded-2xl border border-dashed px-6 py-10 text-center">
      <p className="font-medium">Building your model</p>
      <p className="text-muted-foreground text-sm">
        Log at least 7 days of training to unlock your Daily Brief.
      </p>
      <button
        className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        type="button"
        onClick={onRetry}
      >
        Refresh assessment
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Today View — athlete-first decision center (V3)
// Hierarchy: Decision → Reasoning → Recommendation → Expected Outcome →
//            Primary Limiter → Confidence → Supporting Evidence
// ─────────────────────────────────────────────────────────────────────────────

export function TodayView() {
  const { data, loading, error, refresh } = useToday();

  if (loading) return <TodaySkeleton />;
  if (error) return <TodayError message={error} onRetry={refresh} />;

  const { reasoning, recovery, fatigue, adaptation } = data;

  if (!reasoning || reasoning.overallVerdict === 'INSUFFICIENT_DATA') {
    return <InsufficientDataState onRetry={refresh} />;
  }

  if (!reasoning.topAction) {
    return <InsufficientDataState onRetry={refresh} />;
  }

  // Pick the primary session recommendation based on systemAttentionPriority
  let primaryRecommendation = recovery?.recommendation ?? fatigue?.recommendation ?? null;
  if (reasoning.systemAttentionPriority === 'RECOVERY') {
    primaryRecommendation = recovery?.recommendation ?? null;
  } else if (reasoning.systemAttentionPriority === 'FATIGUE') {
    primaryRecommendation = fatigue?.recommendation ?? null;
  }

  const overreachingRisk = recovery?.overreachingRisk ?? 'LOW';
  const functionalOverreachingRisk = fatigue?.functionalOverreachingRisk ?? 'LOW';
  const fatigueTrajectory = fatigue?.trajectory ?? 'STABLE';

  return (
    <div className="space-y-3">
      {/* 1 — Decision: what should I do today? */}
      <NarrativeHeader
        computedAt={reasoning.computedAt}
        confidence={reasoning.confidence}
        topAction={reasoning.topAction}
        verdict={reasoning.overallVerdict}
      />

      {/* 2 — Reasoning: why? */}
      <ReasoningBlock explanation={reasoning.explanation} keyFindings={reasoning.keyFindings} />

      {/* 3 — Recommendation: what session? */}
      {(adaptation?.decision || primaryRecommendation) && (
        <SessionBlock
          adaptationVerdict={adaptation?.decision?.verdict ?? null}
          recommendation={primaryRecommendation}
          topAction={reasoning.topAction}
        />
      )}

      {/* 4 — Expected outcome: what will happen if I follow the plan? */}
      <ExpectedOutcomeBlock
        adaptationVerdict={adaptation?.decision?.verdict ?? null}
        fatigueTrajectory={fatigueTrajectory}
        fatigueVerdict={fatigue?.decision?.verdict ?? null}
        functionalOverreachingRisk={functionalOverreachingRisk}
        loadMultiplier={adaptation?.decision?.loadMultiplier ?? 1}
        opportunities={reasoning.opportunities}
        overreachingRisk={overreachingRisk}
        recoveryVerdict={recovery?.decision?.verdict ?? null}
        trainingCapacity={fatigue?.trainingCapacity ?? 'FULL'}
      />

      {/* 5 — Primary limiter: what's holding me back? */}
      <BottleneckBlock limitingFactor={reasoning.limitingFactor} />

      {/* 6 — Confidence: how sure is SHARPIT? */}
      <ConfidenceBlock
        availableModelCount={reasoning.signals.availableModelCount}
        confidence={reasoning.confidence}
        consistencyScore={reasoning.consistencyScore}
        dataCompleteness={reasoning.dataCompleteness}
        physiologicalConsistency={reasoning.physiologicalConsistency}
      />

      {/* 7 — Supporting evidence: physiological detail for inspection */}
      <SupportingEvidenceBlock adaptation={adaptation} fatigue={fatigue} recovery={recovery} />

      <p className="text-muted-foreground pt-1 text-center text-xs">
        <button className="underline-offset-2 hover:underline" type="button" onClick={refresh}>
          Refresh assessment
        </button>
      </p>
    </div>
  );
}
