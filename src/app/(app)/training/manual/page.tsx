import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity-form';

export default function ManualTrainingPage() {
  return (
    <div className="space-y-8">
      <MobileBackLink href="/training/history" label="Activités" showOnDesktop />
      <StickyHeader>
        <p className="text-primary text-xs font-medium uppercase">Training</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Saisir une séance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enregistrement manuel d&apos;une séance déjà réalisée (hors import Garmin / Strava).
        </p>
      </StickyHeader>
      <ActivityForm mode="create" />
    </div>
  );
}
