import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanningView } from '@/components/planning/planning-view';

export default function TrainingPlanningPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Entraînement
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Planning</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organisation du cycle, prochaines séances et ajustements du plan.
        </p>
      </StickyHeader>

      <PlanningView embedded showCoachMenu />
    </div>
  );
}
