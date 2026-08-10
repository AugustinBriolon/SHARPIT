import { Suspense } from 'react';
import { TrainingDashboard } from '@/components/training/hub/training-dashboard';

/** Suspense for the current-date read only — the hub owns its skeletons. */
export default function TrainingPage() {
  return (
    <Suspense>
      <TrainingDashboard />
    </Suspense>
  );
}
