import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

/** Route loading chrome for /training — plate + section labels + chip grids. */
export function TrainingHubSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section
        className="analysis-panel rounded-analysis-lg border-primary/20 bg-primary/10 relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10"
        aria-busy
      >
        <p className="text-label inline-flex items-center gap-2">
          <span className="bg-primary/50 h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
          Entraînement
        </p>
        <div className="mt-6">
          <SkeletonDataValue heightClassName="h-9 sm:h-10" widthClassName="w-[min(100%,22rem)]" />
        </div>
        <div className="mt-5">
          <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,16rem)]" />
        </div>
        <p className="text-data text-muted-foreground mt-8 text-xs tracking-wide">
          Ouvrir le planning →
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
          <p className="text-label">Prochaines séances</p>
          <span className="text-muted-foreground text-data text-[11px]">Planning →</span>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className={`border-analysis-border/80 bg-background/50 rounded-analysis flex flex-col gap-2 border px-3 py-2.5${
                i >= 2 ? 'max-sm:hidden' : ''
              }`}
            >
              <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,12rem)]" />
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
          <p className="text-label">Dernières activités</p>
          <span className="text-muted-foreground text-data text-[11px]">Historique →</span>
        </div>
        <ul className="space-y-2">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="border-analysis-border/80 bg-background/50 rounded-analysis flex flex-col gap-2 border px-3 py-2.5"
            >
              <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,14rem)]" />
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-24" />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
          <p className="text-label">Dynamique récente</p>
          <span className="text-muted-foreground text-data text-[11px]">Progression →</span>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="analysis-panel rounded-analysis-lg px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-label">Régularité</p>
            <div className="mt-3">
              <Skeleton className="h-24 w-full rounded-lg sm:h-28" />
            </div>
          </div>
          <div className="analysis-panel rounded-analysis-lg px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-label">Autour d&apos;aujourd&apos;hui</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="min-h-20 rounded-lg sm:min-h-24" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
