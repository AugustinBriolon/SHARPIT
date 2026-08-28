'use client';

import { PageHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PlanningPageHeader({
  isLoading,
  nextRace,
}: {
  isLoading: boolean;
  nextRace?: { goal: { title: string }; target: Date };
}) {
  return (
    <PageHeader>
      <div>
        <p className="text-label">Planning</p>
        <h1 className="text-page-title mt-1">Plan d&apos;entraînement</h1>
        {isLoading ? <Skeleton className="mt-1 h-4 w-48 max-w-full rounded-full border-0" /> : null}
        {!isLoading && nextRace ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {nextRace.goal.title} · {format(nextRace.target, 'd MMMM yyyy', { locale: fr })}
          </p>
        ) : null}
      </div>
    </PageHeader>
  );
}
