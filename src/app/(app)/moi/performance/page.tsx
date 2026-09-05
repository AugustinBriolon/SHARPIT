import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MoiSectionContent } from '@/components/shell/moi-section-content';
import { Skeleton } from '@/components/ui/skeleton';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

function PerformanceFallback() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-32 w-full border-0" />
    </div>
  );
}

/**
 * Dedicated Performance surface — observed best efforts.
 *
 * Thresholds live at `/moi/calibration`, a Moi hub destination of their own.
 * Not a Moi hub destination itself; reached from the Objectifs quiet link.
 * Back stack parent: Moi.
 */
export default function MoiPerformancePage() {
  return (
    <div className="space-y-4 max-lg:pb-10">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Moi" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Performance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Records et lecture de l&apos;entraînement.
        </p>
      </StickyHeader>
      <Suspense fallback={<PerformanceFallback />}>
        <MoiSectionContent section="performance" />
      </Suspense>
    </div>
  );
}
