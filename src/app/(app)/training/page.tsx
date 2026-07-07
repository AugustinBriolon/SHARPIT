import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { TrainingList, TrainingListFallback } from '@/components/training/training-list';
import { LinkButton } from '@/components/ui/link-button';

export default function TrainingPage() {
  return (
    <div className="space-y-8">
      <MobileBackLink href="/seances?tab=activites" label="Activités" showOnDesktop />
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium uppercase">Training</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Séances</h1>
          <p className="text-muted-foreground mt-1">
            Course, vélo, natation et musculation — tout est historisé.
          </p>
        </div>
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </StickyHeader>

      <Suspense fallback={<TrainingListFallback />}>
        <TrainingList />
      </Suspense>
    </div>
  );
}
