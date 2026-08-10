import { Suspense } from 'react';
import { TodayDashboard } from '@/components/today/today-dashboard';

/**
 * Suspense because the dashboard reads the current training day, which cannot
 * be prerendered. Empty fallback on purpose: the dashboard owns its chrome and
 * micro-skeletons, and on a client navigation it renders synchronously.
 */
export default function TodayPage() {
  return (
    <Suspense>
      <TodayDashboard />
    </Suspense>
  );
}
