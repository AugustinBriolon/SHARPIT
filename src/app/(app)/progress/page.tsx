import { Suspense } from 'react';
import { ProgressHub } from '@/components/progress/progress-hub';
import { ProgressHubSkeleton } from '@/components/progress/progress-hub-skeleton';

/** Suspense for `useSearchParams` only — hub chrome lives in the fallback. */
export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressHubSkeleton />}>
      <ProgressHub />
    </Suspense>
  );
}
