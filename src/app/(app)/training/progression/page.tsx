import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records-panel';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';

export default function TrainingProgressionPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Entraînement
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Progression</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Charge, volume, fraîcheur et records pour lire la trajectoire réelle de l’entraînement.
        </p>
      </StickyHeader>

      <section className="space-y-6">
        <AnalyticsClient />
        <RecordsPanel />
      </section>
    </div>
  );
}
