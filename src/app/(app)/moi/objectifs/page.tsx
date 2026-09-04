import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MoiObjectifsToolbar, MoiSectionContent } from '@/components/shell/moi-section-content';
import { Skeleton } from '@/components/ui/skeleton';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

function ObjectifsFallback() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="rounded-analysis-lg h-32 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-40 w-full border-0" />
    </div>
  );
}

/**
 * Dedicated Objectifs surface — goals only.
 * Back stack parent: Moi. Performance is a quiet deep link, not mixed in.
 */
export default function MoiObjectifsPage() {
  return (
    <div className="space-y-4 max-lg:pb-10">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Moi" showOnDesktop />
      <StickyHeader>
        <div className="flex min-h-11 items-start justify-between gap-4 lg:min-h-9">
          <div>
            <p className="text-label">Moi</p>
            <h1 className="text-page-title mt-1">Objectifs</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Courses, métriques prioritaires et proximité aux cibles.
            </p>
          </div>
          <MoiObjectifsToolbar />
        </div>
      </StickyHeader>
      <Suspense fallback={<ObjectifsFallback />}>
        <MoiSectionContent section="objectifs" />
      </Suspense>
    </div>
  );
}
