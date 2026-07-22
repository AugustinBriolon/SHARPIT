import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';

/** Suspense for `useSearchParams` only — no route/hub safety skeleton. */
export default function CoachPage() {
  return (
    <Suspense>
      <CoachView />
    </Suspense>
  );
}
