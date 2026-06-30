import { Suspense } from 'react';
import { SessionsHub } from '@/components/sessions/sessions-hub';
import { Skeleton } from '@/components/ui/skeleton';

export default function SeancesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SessionsHub />
    </Suspense>
  );
}
