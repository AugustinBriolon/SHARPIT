import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanningView } from '@/components/planning/planning-view';

export default function TrainingPlanningPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Planning</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organisation du cycle, prochaines séances et ajustements du plan.
        </p>
      </StickyHeader>

      <PlanningView embedded showCoachMenu />
    </div>
  );
}
