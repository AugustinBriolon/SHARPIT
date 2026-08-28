import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ProShowcase } from '@/components/settings/pro/pro-showcase';
import { Skeleton } from '@/components/ui/skeleton';

function ProShowcaseSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="rounded-analysis-lg h-24 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-64 w-full border-0" />
    </div>
  );
}

export default function SettingsProPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Pro</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ce que le palier Pro apporte, et où tu en es.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the tier read waits. */}
      <Suspense fallback={<ProShowcaseSkeleton />}>
        <ProShowcase />
      </Suspense>
    </div>
  );
}
