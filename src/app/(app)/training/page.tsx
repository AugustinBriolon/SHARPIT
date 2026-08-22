import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainingThreadView } from '@/components/training/thread/training-thread-view';

export default function TrainingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <TrainingThreadView />
    </Suspense>
  );
}
