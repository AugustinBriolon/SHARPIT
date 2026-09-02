import { Suspense } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanHubWidgets } from '@/components/shell/plan-hub-widgets';

/**
 * Plan hub — Shell V1.1 widgets (not an Accès link dump).
 *
 * Widgets: Objectif · Prochaines séances (S/B/R with soft intensity gate) ·
 * Charge/récup. Fil de la semaine and Séjours stay out of the primary path.
 *
 * Soft gate: see `src/lib/plan/intensity-gate.ts` — when Today is RECOVER or
 * CAUTION, hard intensities are withheld from "prochaines".
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
          Objectif, prochaines séances et charge : ajuster sans perdre le fil.
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
    <div className="space-y-6" aria-busy>
      <div className="analysis-panel-alt rounded-analysis-lg h-20 animate-pulse" />
      <div className="space-y-2">
        <div className="analysis-panel-alt rounded-analysis-lg h-16 animate-pulse" />
        <div className="analysis-panel-alt rounded-analysis-lg h-16 animate-pulse" />
      </div>
      <div className="analysis-panel-alt rounded-analysis-lg h-24 animate-pulse" />
    </div>
  );
}
