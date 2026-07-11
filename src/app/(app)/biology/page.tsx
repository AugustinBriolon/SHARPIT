import { Suspense } from 'react';
import { CorpsHubSkeleton } from '@/components/corps/corps-hub-skeleton';
import { CorpsHub } from '@/components/corps/corps-hub';

export default function BiologyPage() {
  return (
    <Suspense fallback={<CorpsHubSkeleton />}>
      <CorpsHub basePath="/biology" />
    </Suspense>
  );
}
