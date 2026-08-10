import { Suspense } from 'react';
import { TrainingDashboard } from '@/components/training/hub/training-dashboard';
import { TrainingDashboardShell } from '@/components/training/hub/training-dashboard-shell';

/** Suspense for the current-date read only — the hub owns its skeletons. */
export default function TrainingPage() {
  return (
    <Suspense fallback={<TrainingDashboardShell />}>
      <TrainingDashboard />
    </Suspense>
  );
}
