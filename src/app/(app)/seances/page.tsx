import { Suspense } from 'react';
import { SessionsHub, SessionsHubSkeleton } from '@/components/sessions/sessions-hub';

export default function SeancesPage() {
  return (
    <Suspense fallback={<SessionsHubSkeleton />}>
      <SessionsHub />
    </Suspense>
  );
}
