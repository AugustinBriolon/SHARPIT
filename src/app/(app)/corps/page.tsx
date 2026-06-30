import { Suspense } from 'react';
import { CorpsHub } from '@/components/corps/corps-hub';
import { Skeleton } from '@/components/ui/skeleton';

export default function CorpsPage() {
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
      <CorpsHub />
    </Suspense>
  );
}
