import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';
import { Skeleton } from '@/components/ui/skeleton';

export default function CoachPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full rounded-xl" />}>
      <CoachView />
    </Suspense>
  );
}
