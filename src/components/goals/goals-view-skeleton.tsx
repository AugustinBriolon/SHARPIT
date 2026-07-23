import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow } from '@/components/ui/skeleton-patterns';

export function GoalsViewSkeleton() {
  return (
    <div className="space-y-8">
      <MobileBackLink showOnDesktop />
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">Réglages</p>
          <h1 className="text-page-title mt-1">Objectifs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Des courses aux objectifs hebdomadaires — toute la hiérarchie.
          </p>
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </StickyHeader>

      <section className="space-y-4">
        <SkeletonEyebrow className="w-32" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} className="rounded-analysis min-h-36 space-y-2">
              <Skeleton className="h-4 w-1/3 rounded-full border-0" />
              <Skeleton className="h-3 w-2/3 rounded-full border-0" />
            </SkeletonCard>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SkeletonEyebrow className="w-40" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="rounded-analysis min-h-28 space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-full border-0" />
              <Skeleton className="h-3 w-1/3 rounded-full border-0" />
            </SkeletonCard>
          ))}
        </div>
      </section>
    </div>
  );
}
