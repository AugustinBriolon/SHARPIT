import { Suspense } from 'react';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { AdaptationScreen } from '@/components/adaptation/adaptation-screen';
import { TWIN_ADAPTATION_READING } from '@/lib/plan/hub/plan-coach-offer';

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
          <MobileDrillDownHeader title={TWIN_ADAPTATION_READING.title} />
        </div>
      }
    >
      <AdaptationScreen />
    </Suspense>
  );
}
