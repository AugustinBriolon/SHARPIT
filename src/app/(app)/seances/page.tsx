import { Suspense } from 'react';
import { SessionsHub } from '@/components/sessions/sessions-hub';
import { Skeleton } from '@/components/ui/skeleton';

export default function SeancesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-56" />
            </div>
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SessionsHub />
    </Suspense>
  );
}
