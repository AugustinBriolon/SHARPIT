import Link from 'next/link';
import { CalendarRange, ClipboardList } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';

/**
 * Plan hub — chrome-first pause (Design V1.1).
 *
 * Deep widgets (Objectif / prochaines gated / charge-récup) are deferred until
 * Design signs off liquid-glass chrome PNGs. Soft intensity gate helper stays
 * in `src/lib/plan/intensity-gate.ts` for the next pass.
 *
 * No Accès link dump. Quiet tools only — Fil de la semaine / Séjours stay out.
 */
export function PlanHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">Organiser les prochains jours</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Chrome liquid-glass en validation Design — widgets Plan reviennent juste après.
        </p>
      </StickyHeader>

      <aside
        aria-label="Widgets Plan en attente"
        className="analysis-panel-alt rounded-analysis-lg space-y-2 p-4"
      >
        <p className="text-label">Design · chrome first</p>
        <p className="text-sm leading-relaxed">
          Objectif, prochaines séances (gate intensité) et charge/récup sont prêts côté structure (
          <code className="text-xs">intensity-gate</code>) et seront branchés dès validation du tab
          bar / back glass.
        </p>
      </aside>

      <nav aria-label="Outils plan" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          href="/training/planning"
        >
          <CalendarRange aria-hidden className="size-3.5" />
          Planification
        </Link>
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          href="/training/weekly-review"
        >
          <ClipboardList aria-hidden className="size-3.5" />
          Bilan hebdo
        </Link>
      </nav>
    </div>
  );
}
