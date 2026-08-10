import { Suspense } from 'react';
import { TodayDashboard } from '@/components/today/today-dashboard';
import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayDashboardShell />}>
      <TodayDashboard />
    </Suspense>
  );
}
