import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MoiSectionContent } from '@/components/shell/moi-section-content';
import { Skeleton } from '@/components/ui/skeleton';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

function CorpsFallback() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="rounded-analysis-lg h-40 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
    </div>
  );
}

/**
 * Dedicated Corps surface — composition + suivi only.
 * Back stack parent: Moi. No objectifs / perf mix.
 */
export default function MoiCorpsPage() {
  return (
    <div className="space-y-4 max-lg:pb-10">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Moi" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Corps</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Composition, suivi physique et contraintes de santé.
        </p>
      </StickyHeader>
      <Suspense fallback={<CorpsFallback />}>
        <MoiSectionContent section="corps" />
      </Suspense>
    </div>
  );
}
