import { notFound } from 'next/navigation';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity/form/activity-form';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getActivityById } from '@/lib/queries';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditActivityPage({ params }: PageProps) {
  const { id } = await params;
  const athleteId = await getCurrentAthleteId();
  const activity = await getActivityById(athleteId, id);

  if (!activity) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <MobileBackLink href={`/activite/${id}`} label="Séance" replace showOnDesktop />
      <StickyHeader>
        <p className="text-primary text-xs font-medium uppercase">Activité</p>
        <h1 className="text-page-title mt-1">Modifier la séance</h1>
      </StickyHeader>
      <ActivityForm initialData={activity} mode="edit" />
    </div>
  );
}
