import { CalendarDays, CalendarRange, ClipboardList } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ShellHubLink } from '@/components/shell/shell-hub-link';

/**
 * Plan hub — Shell V1 placeholder.
 *
 * Full plan logic (macro, adapter, scenario) can stay stubbed. Existing week
 * thread and planning surfaces remain the real destinations.
 *
 * Science Sport (V1 constraint, deferred enforcement): when Today's verdict is
 * RECOVER or CAUTION, Plan must not propose hard sessions — gate / Coach plan
 * paths should honour this before shipping full Plan intelligence.
 */
export function PlanHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">Organiser les prochains jours</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Semaine, planification et bilan — le fil d&apos;entraînement reste la source de vérité.
        </p>
      </StickyHeader>

      <section aria-labelledby="plan-entries" className="space-y-3">
        <h2 className="text-section-title" id="plan-entries">
          Accès
        </h2>
        <ul className="space-y-2">
          <ShellHubLink
            href="/training"
            title="Fil de la semaine"
            description="Calendrier, séances planifiées et charge sur l’horizon proche."
            icon={CalendarDays}
          />
          <ShellHubLink
            href="/training/planning"
            title="Planification"
            description="Construire ou ajuster le plan sur la fenêtre courante."
            icon={CalendarRange}
          />
          <ShellHubLink
            href="/training/weekly-review"
            title="Bilan hebdo"
            description="Lecture de la semaine écoulée et orientation pour la suivante."
            icon={ClipboardList}
          />
        </ul>
      </section>

      <aside
        aria-label="Contrainte Science Sport"
        className="analysis-panel-alt rounded-analysis-lg space-y-2 p-4"
      >
        <p className="text-label">Science Sport · V1</p>
        <p className="text-sm leading-relaxed">
          Quand le verdict Today est <span className="font-medium">RECOVER</span> ou{' '}
          <span className="font-medium">CAUTION</span>, Plan ne doit pas proposer de séances
          dures. La logique complète reste à brancher ; cette contrainte est le garde-fou produit
          avant le stub Plan.
        </p>
      </aside>
    </div>
  );
}
