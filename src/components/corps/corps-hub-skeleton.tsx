import { Activity, Scale } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { navPillClass } from '@/lib/nav-pill';

/** Suspense / route chrome for /biology — StickyHeader matches loaded CorpsHub. */
export function CorpsHubSkeleton() {
  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-label">Mon corps</p>
        <h1 className="text-page-title mt-1">Forme & bien-être</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Poids, masse grasse et tendances impédancemétrie.
        </p>

        <nav
          aria-label="Sections Mon corps"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          <span className={navPillClass(true)}>
            <Scale className="size-3.5" aria-hidden />
            Composition
          </span>
          <span className={navPillClass(false)}>
            <Activity className="size-3.5" aria-hidden />
            Suivi physique
          </span>
        </nav>
      </StickyHeader>

      <div className="space-y-4 lg:space-y-5">
        <section
          className="analysis-panel rounded-analysis-lg border-primary/20 bg-primary/10 relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10"
          aria-busy
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-label inline-flex items-center gap-2">
              <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
              Dernière pesée
            </p>
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
          </div>
          <div className="mt-6">
            <SkeletonDataValue heightClassName="h-10" widthClassName="w-28" />
          </div>
          <div className="mt-3">
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-24" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {['Masse grasse', 'Muscle', 'Viscéral'].map((label) => (
            <div
              key={label}
              className="border-analysis-border/80 bg-background/50 flex flex-col gap-1 rounded-lg border px-3 py-2.5"
            >
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                {label}
              </span>
              <SkeletonDataValue heightClassName="h-4" widthClassName="w-12" />
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
            <p className="text-label">Tendances</p>
            <div className="surface-shell inline-flex flex-wrap gap-1 rounded-full p-1">
              {['14 j', '30 j', '90 j', '1 an', 'Tout'].map((label) => (
                <span
                  key={label}
                  className="text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Skeleton className="h-40 w-full rounded-lg sm:h-48" />
        </section>
      </div>
    </div>
  );
}
