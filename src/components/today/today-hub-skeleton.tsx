import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

/** Route loading chrome for Today (/) — plate + signal chips + sections. */
export function TodayHubSkeleton() {
  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <section
        className="analysis-panel rounded-analysis-lg border-primary/25 bg-primary/12 relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10"
        aria-busy
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label inline-flex items-center gap-2">
            <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-48 sm:w-64" />
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-44 sm:w-56" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
        </div>
        <div className="mt-6">
          <SkeletonDataValue
            heightClassName="h-[1.75rem] sm:h-[2.125rem]"
            widthClassName="w-[min(100%,20rem)]"
          />
        </div>
        <div className="mt-5">
          <Skeleton className="h-5 w-[min(100%,18rem)] rounded-full" />
        </div>
      </section>

      <nav aria-label="Signaux physiologiques" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {['Sommeil', 'Récup', 'Adapt', 'Effort'].map((label) => (
          <span
            key={label}
            className="border-analysis-border/80 bg-analysis-surface-alt/70 inline-flex min-w-0 items-center justify-between gap-1.5 rounded-lg border px-2.5 py-2 sm:justify-start sm:py-1.5"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="bg-muted h-2 w-2 shrink-0 rounded-full" aria-hidden />
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                {label}
              </span>
              <SkeletonDataValue heightClassName="h-4" widthClassName="w-7" />
            </span>
            <span className="text-muted-foreground/70 text-[10px]" aria-hidden>
              →
            </span>
          </span>
        ))}
      </nav>

      <section className="space-y-2">
        <p className="text-label px-0.5">Aujourd’hui</p>
        <ul className="space-y-2">
          <li className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5">
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-full max-w-[240px]" />
          </li>
        </ul>
      </section>
    </div>
  );
}
