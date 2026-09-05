import { Suspense } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanHubWidgets } from '@/components/shell/plan-hub-widgets';

/**
 * Plan hub — the athlete's week, read against the goal it serves.
 *
 * Causal order: destination, week decision, then the thread (owed, done,
 * block state, projection). Chrome stays outside Suspense (Instant UX).
 */
export function PlanHub() {
  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">Ton cap, cette semaine</h1>
      </StickyHeader>

      <Suspense fallback={<PlanHubWidgetsFallback />}>
        <PlanHubWidgets />
      </Suspense>
    </div>
  );
}

/** Prerender-safe loading shell for Plan widgets (mirrors Today Suspense fallback). */
function PlanHubWidgetsFallback() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="surface-ink rounded-analysis-lg h-32 animate-pulse" />
      <div className="space-y-3">
        <div className="analysis-panel-alt rounded-analysis-lg h-16 animate-pulse" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="analysis-panel-alt rounded-analysis-sm h-12 animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="analysis-panel-alt rounded-analysis-lg h-24 animate-pulse" />
      <div className="analysis-panel-alt rounded-analysis-lg h-20 animate-pulse" />
    </div>
  );
}
