import { Suspense } from 'react';
import { GoalsCapViewSkeleton } from '@/components/goals/cap/goals-cap-view';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { MoiObjectifsToolbar, MoiSectionContent } from '@/components/shell/moi-section-content';
import { MOI_HUB_PATH } from '@sharpit/server/lib/moi/paths';

/**
 * Cap surface — primary goal follow-up + trajectory, then inventory.
 * Back stack parent: Moi. Performance is a quiet deep link, not mixed in.
 */
export default function MoiObjectifsPage() {
  return (
    <div className="space-y-4 max-lg:pb-10">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <div className="flex min-h-11 items-start justify-between gap-4 lg:min-h-9">
          <div>
            <p className="text-label">Moi</p>
            <h1 className="text-page-title mt-1">Objectifs</h1>
            <p className="text-muted-foreground mt-1 max-w-[40ch] text-sm text-pretty">
              Volume vers le cap, et où tu en es par rapport à l’objectif.
            </p>
          </div>
          <MoiObjectifsToolbar />
        </div>
      </StickyHeader>
      <Suspense fallback={<GoalsCapViewSkeleton />}>
        <MoiSectionContent section="objectifs" />
      </Suspense>
    </div>
  );
}
