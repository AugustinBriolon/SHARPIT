import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { TrainingList, TrainingListFallback } from '@/components/training/hub/training-list';
import { LinkButton } from '@/components/ui/link-button';

/**
 * Activité hub — Shell V1.1 workflow (not an Accès link dump).
 *
 * Historique list + CTA Nouvelle activité. Séjours stay reachable via deep
 * link (`/activite/sejours`) but are not featured here.
 *
 * Chrome stays outside Suspense (Instant UX); the list streams like Plan/Today.
 */
export function ActivityHub() {
  return (
    <div className="space-y-6 max-lg:pb-10">
      <StickyHeader>
        <p className="text-label">Activité</p>
        <h1 className="text-page-title mt-1">Ce que tu as fait</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Historique des séances réalisées — lecture de l&apos;exécution, pas du plan.
        </p>
      </StickyHeader>

      <div>
        <LinkButton className="gap-1.5" href="/activite/nouvelle" size="sm">
          <Plus className="size-3.5" aria-hidden />
          Nouvelle activité
        </LinkButton>
      </div>

      <section aria-labelledby="activity-history" className="space-y-3">
        <h2 className="text-section-title" id="activity-history">
          Historique
        </h2>
        <Suspense fallback={<TrainingListFallback />}>
          <TrainingList />
        </Suspense>
      </section>
    </div>
  );
}
