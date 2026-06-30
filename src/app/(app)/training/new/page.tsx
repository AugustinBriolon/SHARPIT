import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity-form';

export default function NewTrainingPage() {
  return (
    <div className="space-y-8">
      <StickyHeader>
        <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Training</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Nouvelle séance</h1>
      </StickyHeader>
      <ActivityForm mode="create" />
    </div>
  );
}
