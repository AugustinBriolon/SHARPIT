import { Suspense } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanHubWidgets } from '@/components/shell/plan-hub-widgets';

/**
 * Plan hub — the athlete's week, read against the goal it serves.
 *
 * Sections follow `docs/design/INFORMATION_ARCHITECTURE.md` ("My week"):
 * goal, the week as one canonical planned-and-completed list, the projected
 * effect of holding it, then the actions that change it.
 *
 * Chrome stays outside Suspense (Instant UX); widgets stream like Today.
 */
export function PlanHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">Organiser les prochains jours</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ton objectif, ce que la semaine demande, ce qui est déjà fait, et ce que ça va produire.
        </p>
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
    <div className="space-y-8" aria-busy>
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
    </div>
  );
}
