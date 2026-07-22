import { Suspense } from 'react';
import { SessionsHub } from '@/components/sessions/sessions-hub';

/** Suspense for `useSearchParams` only — no route/hub safety skeleton. */
export default function TrainingSessionsPage() {
  return (
    <Suspense>
      <SessionsHub />
    </Suspense>
  );
}
