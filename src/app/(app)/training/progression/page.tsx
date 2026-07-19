import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records-panel';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';

export default function TrainingProgressionPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Progression</h1>
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
