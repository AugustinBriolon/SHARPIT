import { Suspense } from 'react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { AdaptationScreen } from '@/components/adaptation/adaptation-screen';

/**
 * The drill-down reads the selected day from the URL, so it streams. The header
 * is static and identical to the one the screen renders, so it sits in the
 * prerendered shell and nothing shifts when the screen arrives.
 */
export default function PlanAdaptationPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <MobileDrillDownHeader title="Adaptation" />
        </div>
      }
    >
      <AdaptationScreen />
    </Suspense>
  );
}
