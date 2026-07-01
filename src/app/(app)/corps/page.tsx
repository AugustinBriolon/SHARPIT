import { Suspense } from 'react';
import { CorpsHub } from '@/components/corps/corps-hub';
import { Skeleton } from '@/components/ui/skeleton';

export default function CorpsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <CorpsHub />
    </Suspense>
  );
}
