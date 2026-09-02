import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ActivityForm } from '@/components/training/activity/form/activity-form';
import { Skeleton } from '@/components/ui/skeleton';

function ActivityFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="analysis-panel rounded-analysis-lg space-y-4 p-4">
          <Skeleton className="h-5 w-32 rounded-full border-0" />
          <Skeleton className="rounded-analysis h-10 w-full border-0" />
          <Skeleton className="rounded-analysis h-10 w-full border-0" />
        </div>
      ))}
      <Skeleton className="rounded-analysis h-11 w-full border-0" />
    </div>
  );
}

export default function ManualTrainingPage() {
  return (
    <div className="space-y-8">
      <MobileBackLink fallbackHref="/activite" fallbackLabel="Activité" showOnDesktop />
      <StickyHeader>
        <p className="text-primary text-xs font-medium uppercase">Training</p>
        <h1 className="text-page-title mt-1">Saisir une séance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enregistrement manuel d&apos;une séance déjà réalisée (hors import Garmin / Strava).
        </p>
      </StickyHeader>
      {/* The form defaults its date field to today — not prerenderable. */}
      <Suspense fallback={<ActivityFormSkeleton />}>
        <ActivityForm mode="create" />
      </Suspense>
    </div>
  );
}
