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
 */
export function PlanHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">Organiser les prochains jours</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Objectif, prochaines séances et charge — ajuster sans perdre le fil.
        </p>
      </StickyHeader>

      <PlanHubWidgets />
    </div>
  );
}
