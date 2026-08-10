import { Suspense } from 'react';
import { CorpsHub } from '@/components/corps/corps-hub';
import { CorpsHubSkeleton } from '@/components/corps/corps-hub-skeleton';

/** Suspense for `useSearchParams` only — hub chrome lives in the fallback. */
export default function BiologyPage() {
  return (
    <Suspense fallback={<CorpsHubSkeleton />}>
      <CorpsHub basePath="/biology" />
    </Suspense>
  );
}
