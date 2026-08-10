import { Skeleton } from '@/components/ui/skeleton';

const DAY_COUNT = 7;

/** Content-only planning pulse — matches embedded `PlanningView` loading rows. */
export function PlanningEmbeddedSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-1">
          <Skeleton className="size-11 shrink-0 rounded-xl border-0 lg:size-9" />
          <Skeleton className="mx-auto h-5 w-40 max-w-full rounded-full border-0 sm:mx-0" />
          <Skeleton className="size-11 shrink-0 rounded-xl border-0 lg:size-9" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 shrink-0 rounded-full border-0" />
          <Skeleton className="ml-auto h-8 w-8 shrink-0 rounded-xl border-0" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Skeleton className="h-4 w-10 rounded-full border-0" />
        <Skeleton className="h-4 w-24 rounded-full border-0" />
        <Skeleton className="h-4 w-28 rounded-full border-0" />
      </div>

      <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
        {Array.from({ length: DAY_COUNT }).map((_, index) => (
          <div key={index} className="flex gap-3 px-3 py-3 sm:gap-4 sm:px-4">
            <div className="w-11 shrink-0 space-y-1.5 text-center sm:w-12">
              <Skeleton className="mx-auto h-3 w-6 rounded-full border-0" />
              <Skeleton className="mx-auto h-6 w-5 rounded-full border-0" />
            </div>
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <Skeleton className="rounded-analysis h-12 w-full border-0" />
              <Skeleton className="rounded-analysis h-12 w-4/5 border-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
