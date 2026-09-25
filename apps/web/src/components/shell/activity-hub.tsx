import { Suspense } from 'react';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { TrainingList, TrainingListFallback } from '@/components/training/hub/training-list';
import {
  TrainingNextSession,
  TrainingNextSessionFallback,
} from '@/components/training/hub/training-next-session';

/**
 * Activité hub — Shell V1.1 workflow (not an Accès link dump).
 *
 * Séances du jour (PlannedSessionPreview) + historique (CompletedSessionPreview).
 * Séjours stay reachable via deep link (`/activite/sejours`).
 *
 * Chrome stays outside Suspense (Instant UX); bodies stream like Plan/Today.
 */
export function ActivityHub() {
  return (
    <div className="space-y-5 max-lg:pb-10">
      <StickyHeader>
        <p className="text-label">Activité</p>
        <h1 className="text-page-title mt-1" id="activity-hub-title">
          Ce que tu as fait
        </h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
          Journal d&apos;exécution — chaque séance, sa date, sa charge. Pas le plan.
        </p>
      </StickyHeader>

      <section aria-labelledby="activity-hub-title" className="space-y-6">
        <Suspense fallback={<TrainingNextSessionFallback />}>
          <TrainingNextSession />
        </Suspense>
        <Suspense fallback={<TrainingListFallback />}>
          <TrainingList />
        </Suspense>
      </section>
    </div>
  );
}
