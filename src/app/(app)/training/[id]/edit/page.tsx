import { notFound } from 'next/navigation';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity-form';
import { getActivityById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTrainingPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) notFound();

  return (
    <div className="space-y-8">
      <MobileBackLink href={`/training/${id}`} label="Séance" />
      <StickyHeader>
        <p className="text-primary text-xs font-medium uppercase">Training</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Modifier la séance</h1>
      </StickyHeader>
      <ActivityForm initialData={activity} mode="edit" />
    </div>
  );
}
