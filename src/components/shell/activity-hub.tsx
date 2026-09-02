import { Footprints, History, Map } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ShellHubLink } from '@/components/shell/shell-hub-link';

/**
 * Activité hub — Shell V1 placeholder.
 * History, trips and manual entry stay on their existing routes.
 */
export function ActivityHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Activité</p>
        <h1 className="text-page-title mt-1">Ce que tu as fait</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Historique, séjours et saisie manuelle — lecture de l&apos;exécution, pas du plan.
        </p>
      </StickyHeader>

      <section aria-labelledby="activity-entries" className="space-y-3">
        <h2 className="text-section-title" id="activity-entries">
          Accès
        </h2>
        <ul className="space-y-2">
          <ShellHubLink
            href="/training/history"
            title="Historique"
            description="Activités enregistrées, du plus récent au plus ancien."
            icon={History}
          />
          <ShellHubLink
            href="/training/trips"
            title="Séjours"
            description="Randonnées multi-jours et dossiers de séjour."
            icon={Map}
          />
          <ShellHubLink
            href="/training/manual"
            title="Nouvelle activité"
            description="Saisir une séance qui n’est pas encore synchronisée."
            icon={Footprints}
          />
        </ul>
      </section>
    </div>
  );
}
