import { Suspense } from 'react';
import { ThreadPageSkeleton } from '@/components/training/thread/thread-skeleton';
import { TrainingThreadView } from '@/components/training/thread/training-thread-view';

export default function TrainingPage() {
  return (
    <Suspense fallback={<ThreadPageSkeleton />}>
      <TrainingThreadView />
    </Suspense>
  );
}
