'use client';

import { useToday } from '@/hooks/use-today';
import { ScoreCardRow } from './score-card-row';
import { NarrativeHeader } from './narrative-header';
import { ReasoningBlock } from './reasoning-block';
import { SessionBlock } from './session-block';
import { HealthMonitorBlock } from './health-monitor-block';
import { ConfidenceBlock } from './confidence-block';
import { SupportingEvidenceBlock } from './supporting-evidence-block';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function TodaySkeleton() {
  return (
    <div aria-label="Chargement de ton bilan" className="animate-pulse space-y-4" aria-busy>
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
        Réessayer
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
      <p className="font-medium">Construction de ton profil</p>
      <p className="text-muted-foreground text-sm">
        Connecte au moins 7 jours de séances pour débloquer ton Bilan Quotidien.
      </p>
      <button
        className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        type="button"
        onClick={onRetry}
      >
        Actualiser
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

  return (
    <div className="space-y-3">
      {/* 1 — Score cards: instant physiological state */}
      <ScoreCardRow
        effortScore={fatigue?.fatigueIndex ?? null}
        fatigueLevel={fatigue?.fatigueLevel ?? 'INSUFFICIENT_DATA'}
        fatigueTrajectory={fatigue?.trajectory ?? 'STABLE'}
        recoveryCategory={recovery?.readinessCategory ?? 'INSUFFICIENT_DATA'}
        recoveryScore={recovery?.readinessScore ?? null}
        sleepAdequacy={recovery?.signals?.sleepAdequacy ?? ''}
        sleepScore={recovery?.dimensions?.sleep?.score ?? null}
      />

      {/* 2 — Decision: what should I do today? */}
      <NarrativeHeader
        computedAt={reasoning.computedAt}
        confidence={reasoning.confidence}
        topAction={reasoning.topAction}
        verdict={reasoning.overallVerdict}
      />

      {/* 3 — Reasoning: why? */}
      <ReasoningBlock keyFindings={reasoning.keyFindings} />

      {/* 4 — Recommendation: what session? */}
      {(adaptation?.decision || primaryRecommendation) && (
        <SessionBlock
          adaptationVerdict={adaptation?.decision?.verdict ?? null}
          recommendation={primaryRecommendation}
          topAction={reasoning.topAction}
        />
      )}

      {/* 5 — Health monitor: key physiological signals */}
      {(recovery || fatigue || adaptation) && (
        <HealthMonitorBlock
          adaptation={adaptation}
          fatigue={fatigue}
          limitingFactor={reasoning.limitingFactor}
          recovery={recovery}
        />
      )}

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
          Actualiser l'évaluation
        </button>
      </p>
    </div>
  );
}
