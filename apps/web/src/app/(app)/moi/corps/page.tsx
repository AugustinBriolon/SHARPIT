import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { CorpsInstrument, CorpsInstrumentBlock } from '@/components/corps/corps-instrument';
import { MoiSectionContent } from '@/components/shell/moi-section-content';
import { Skeleton } from '@/components/ui/skeleton';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

function CorpsFallback() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="rounded-analysis-lg h-36 w-full border-0" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Skeleton className="h-16 rounded-2xl border-0" />
        <Skeleton className="h-16 rounded-2xl border-0" />
        <Skeleton className="h-16 rounded-2xl border-0" />
        <Skeleton className="h-16 rounded-2xl border-0" />
      </div>
      <Skeleton className="rounded-analysis-lg h-40 w-full border-0" />
    </div>
  );
}

/**
 * Corps instrument — composition + suivi only.
 * Profile attributes (taille, sommeil) live on Réglages → Profil.
 */
export default function MoiCorpsPage() {
  return (
    <div className="max-lg:pb-10">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Corps</h1>
        <p className="text-muted-foreground mt-1 text-sm">Où en est ton corps aujourd&apos;hui.</p>
      </StickyHeader>

      <CorpsInstrument className="mt-5">
        <CorpsInstrumentBlock>
          <Suspense fallback={<CorpsFallback />}>
            <MoiSectionContent section="corps" />
          </Suspense>
        </CorpsInstrumentBlock>
      </CorpsInstrument>
    </div>
  );
}
