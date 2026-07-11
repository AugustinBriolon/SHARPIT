import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { TrainingList, TrainingListFallback } from '@/components/training/training-list';

export default function TrainingHistoryPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Entraînement
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">History</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Historique complet des activités enregistrées, du plus récent au plus ancien.
        </p>
      </StickyHeader>

      <Suspense fallback={<TrainingListFallback />}>
        <TrainingList />
      </Suspense>
    </div>
  );
}
