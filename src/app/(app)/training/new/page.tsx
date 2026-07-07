import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity-form';

export default function NewTrainingPage() {
  return (
    <div className="space-y-8">
      <MobileBackLink href="/seances?tab=activites" label="Activités" showOnDesktop />
      <StickyHeader>
        <p className="text-primary text-xs font-medium uppercase">Training</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Nouvelle séance</h1>
      </StickyHeader>
      <ActivityForm mode="create" />
    </div>
  );
}
