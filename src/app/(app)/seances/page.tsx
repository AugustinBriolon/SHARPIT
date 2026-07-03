import { Suspense } from 'react';
import { SessionsHub } from '@/components/sessions/sessions-hub';
import { Skeleton } from '@/components/ui/skeleton';

export default function SeancesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-72 rounded-full" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <SessionsHub />
    </Suspense>
  );
}
