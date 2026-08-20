import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonAnalysisPanelAlt,
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';
import type { ActivityDetailSkeletonLayout } from '@/lib/activity/detail/activity-detail-skeleton-layout';
import { cn } from '@/lib/utils';

/** KPI strip — mirrors InstrumentMetricGrid chrome (hero Distance / Temps / …). */
export function ActivityMetricStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto overflow-y-visible overscroll-x-contain',
        'snap-x snap-mandatory scroll-px-0.5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'sm:grid sm:snap-none sm:gap-3 sm:overflow-visible',
        count >= 4 && 'sm:grid-cols-4',
        count === 3 && 'sm:grid-cols-3',
        count === 2 && 'sm:grid-cols-2',
        count === 1 && 'sm:grid-cols-1',
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="chip-surface relative min-w-[9.75rem] shrink-0 snap-start overflow-visible rounded-2xl px-3.5 py-3.5 sm:min-w-0 sm:shrink sm:px-4 sm:py-4"
        >
          <Skeleton className="h-3 w-16 rounded-full border-0" />
          <Skeleton className="mt-2.5 h-8 w-20 rounded-lg border-0" />
        </div>
      ))}
    </div>
  );
}

/** Performance block — single analysis panel with adaptive metric rows. */
export function ActivityPerformanceSkeleton({ count = 4 }: { count?: number }) {
  const compact = count >= 6;

  return (
    <section className="analysis-panel rounded-analysis-lg px-5 pt-5 pb-2 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-label">Performance</p>
        <Skeleton className="h-3 w-28 rounded-full border-0" />
      </div>

      <div className="border-analysis-border/70 divide-analysis-border/60 mt-4 border-t">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'grid items-start gap-x-4 border-b last:border-b-0',
              compact
                ? 'grid-cols-[minmax(0,1fr)_auto] gap-y-1 py-3 last:pb-2'
                : 'grid-cols-[minmax(0,1fr)_auto] gap-y-1.5 py-3.5 last:pb-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]',
            )}
          >
            <div className="min-w-0">
              <Skeleton className="h-3 w-10 rounded-full border-0" />
              <Skeleton className="mt-1 h-3 w-24 rounded-full border-0 sm:hidden" />
            </div>
            {!compact ? (
              <Skeleton className="hidden h-3 w-24 rounded-full border-0 sm:block" />
            ) : null}
            <Skeleton className="ml-auto h-6 w-16 rounded-lg border-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CoachReadingSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonAnalysisPanelAlt className={cn('flex-1', className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="size-2 shrink-0 rounded-full" />
        <p className="text-label">Lecture du coach</p>
      </div>
      <SkeletonTitle className="mt-4" size="md" />
      <SkeletonText className="mt-3" widths={['100%', '92%', '70%']} />
    </SkeletonAnalysisPanelAlt>
  );
}

function ZonesSkeleton() {
  return (
    <div className="bg-analysis-surface-alt rounded-analysis-lg space-y-3 px-4 py-4">
      <Skeleton className="h-3 w-40 rounded-full border-0" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[28px_1fr_auto] items-center gap-2">
          <Skeleton className="h-3 w-6 rounded-full border-0" />
          <Skeleton className="h-2.5 w-full rounded-full border-0" />
          <Skeleton className="h-3 w-10 rounded-full border-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Coach ± map composition skeleton.
 * Mobile: coach first when both. Desktop: map left, coach right.
 */
export function ActivityCompositionSkeleton({
  withCoach = true,
  withMap = true,
}: {
  withCoach?: boolean;
  withMap?: boolean;
}) {
  if (!withCoach && !withMap) return null;

  if (withCoach && !withMap) {
    return (
      <div className="flex min-h-0 flex-col gap-4">
        <CoachReadingSkeleton />
        <ZonesSkeleton />
      </div>
    );
  }

  if (!withCoach && withMap) {
    return <Skeleton className="h-80 w-full rounded-xl sm:h-96" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <div className="order-1 flex min-h-0 flex-col gap-4 lg:order-2">
        <CoachReadingSkeleton />
        <ZonesSkeleton />
      </div>
      <Skeleton className="order-2 h-80 w-full rounded-xl sm:h-96 lg:order-1 lg:min-h-full" />
    </div>
  );
}

/** Stream body after hero — composition → Performance → Profils → Splits. */
export function ActivityInsightsBodySkeleton({
  withMap = true,
  withCoach = true,
  withSplits = true,
  withPerformance = true,
}: {
  withMap?: boolean;
  withCoach?: boolean;
  withSplits?: boolean;
  /** Outdoor bike/run usually have NP/IF/VI/TSS; pool swim often does not. */
  withPerformance?: boolean;
}) {
  return (
    <div className="space-y-8">
      <ActivityCompositionSkeleton withCoach={withCoach} withMap={withMap} />

      {withPerformance ? <ActivityPerformanceSkeleton /> : null}

      <section className="space-y-4">
        <p className="text-label">Profils</p>
        <SkeletonCard className="min-h-56 px-5 py-5">
          <Skeleton className="rounded-analysis h-48 w-full border-0" />
        </SkeletonCard>
      </section>

      {withSplits ? (
        <section className="space-y-3">
          <p className="text-label px-0.5">Splits</p>
          <div className="chip-surface rounded-analysis-lg overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="border-analysis-border/60 flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-10 rounded-full border-0" />
                <Skeleton className="h-4 w-14 rounded-full border-0" />
                <Skeleton className="h-4 w-16 rounded-full border-0" />
                <Skeleton className="h-4 w-10 rounded-full border-0" />
                <Skeleton className="ml-auto h-4 w-12 rounded-full border-0" />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Strength exercises list placeholder. */
export function ActivityStrengthListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonCard className="space-y-2 px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <SkeletonEyebrow className="mb-0 w-24" />
        <Skeleton className="h-8 w-28 rounded-lg border-0" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-analysis-border rounded-analysis flex items-center gap-3 border px-3 py-3"
        >
          <Skeleton className="size-12 shrink-0 rounded-lg border-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[min(100%,12rem)] rounded-full border-0" />
            <Skeleton className="h-3 w-24 rounded-full border-0" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full border-0" />
        </div>
      ))}
    </SkeletonCard>
  );
}

function ActivityDetailHeaderSkeleton() {
  return (
    <StickyHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* icon-well is always a circle */}
          <Skeleton className="size-11 shrink-0 rounded-full border-0 sm:size-12" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-[min(100%,14rem)] rounded-full border-0" />
            <Skeleton className="mt-1.5 h-8 w-[min(100%,18rem)] rounded-lg border-0 sm:h-9" />
            <Skeleton className="mt-1.5 h-4 w-36 rounded-full border-0" />
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-1.5 sm:gap-2">
          <Skeleton className="h-9 w-[4.75rem] rounded-lg border-0 sm:w-48" />
          <Skeleton className="size-8 rounded-lg border-0" />
        </div>
      </div>
    </StickyHeader>
  );
}

/** Meta chips (optional) + hero InstrumentMetric strip. */
function ActivityDetailMetaSkeleton() {
  return (
    <div className="relative z-0 space-y-4 sm:space-y-5">
      <ActivityMetricStripSkeleton />
    </div>
  );
}

function ActivityDetailFooterSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SkeletonCard className="min-h-28 px-5 py-5 lg:col-span-2">
        <SkeletonEyebrow className="w-32" />
        <SkeletonText className="mt-4" widths={['55%', '48%', '40%']} />
      </SkeletonCard>
      <SkeletonCard className="min-h-28 px-5 py-5">
        <SkeletonEyebrow className="w-16" />
        <SkeletonText className="mt-4" widths={['100%', '72%']} />
      </SkeletonCard>
    </div>
  );
}

/**
 * Full activity detail page skeleton — layout-aware.
 * Parent route supplies MobileBackLink + outer spacing.
 */
export function ActivityDetailSkeleton({
  layout = 'map',
}: {
  layout?: ActivityDetailSkeletonLayout;
}) {
  if (layout === 'strength') {
    return (
      <>
        <ActivityDetailHeaderSkeleton />
        <div className="relative z-0 space-y-4 sm:space-y-5">
          <ActivityMetricStripSkeleton count={4} />
          <ActivityStrengthListSkeleton />
        </div>
        <ActivityDetailFooterSkeleton />
      </>
    );
  }

  if (layout === 'no-map') {
    return (
      <>
        <ActivityDetailHeaderSkeleton />
        <ActivityDetailMetaSkeleton />
        <ActivityInsightsBodySkeleton
          withMap={false}
          withSplits={false}
          withCoach
          withPerformance
        />
        <ActivityDetailFooterSkeleton />
      </>
    );
  }

  // map — outdoor RUN / BIKE (and open-water SWIM): coach | route → Performance → Profils → Splits
  return (
    <>
      <ActivityDetailHeaderSkeleton />
      <ActivityDetailMetaSkeleton />
      <ActivityInsightsBodySkeleton withCoach withMap withPerformance withSplits />
      <ActivityDetailFooterSkeleton />
    </>
  );
}
