import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';
import { CoachHubSkeleton } from '@/components/coach/coach-hub-skeleton';

export default function CoachPage() {
  return (
    <Suspense fallback={<CoachHubSkeleton />}>
      <CoachView />
    </Suspense>
  );
}
