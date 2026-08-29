import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { RULER_WINDOW } from '@/lib/training/thread/load-ruler';
import { cn } from '@/lib/utils';

/**
 * The thread while it loads, in the shape it will have.
 *
 * Three grey rectangles told the athlete nothing and then rearranged the page
 * under him when the data landed. This keeps the same tree: every heading, rule
 * and door that does not depend on data is simply rendered, and only the figures
 * pulse. Nothing moves at the moment of arrival, and the page is already legible
 * as *this* page before a single number exists.
 */

/** Fixed heights: a random ramp would flicker on every re-render. */
const RULER_BAR_HEIGHTS = [38, 62, 30, 74, 48, 56, 34, 68, 44];

function Row({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <div className="w-11 shrink-0 pt-2.5 text-right lg:w-[60px]">
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-7" />
      </div>
      <div
        className="border-analysis-border/50 rounded-analysis flex min-w-0 flex-1 items-center gap-2.5 border px-3 py-2.5"
        aria-hidden
      >
        <span className="bg-muted/60 size-[7px] shrink-0 animate-pulse rounded-full" />
        <SkeletonDataValue
          heightClassName="h-3.5"
          widthClassName={wide ? 'w-[min(100%,15rem)]' : 'w-[min(100%,10rem)]'}
        />
        <span className="ml-auto hidden lg:block">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-24" />
        </span>
      </div>
    </div>
  );
}

export function ThreadGoalBannerSkeleton() {
  return (
    <section className="surface-ink rounded-analysis-lg overflow-hidden px-5 py-5 sm:px-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-[46ch]">
        <p className="text-ink-surface-foreground/60 text-data inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide uppercase">
          <span
            className="bg-highlight dark:bg-ink-surface-foreground size-[9px] shrink-0 rounded-full"
            aria-hidden
          />
          Objectif
        </p>
        <div className="mt-2">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-6"
            widthClassName="w-[min(100%,18rem)]"
          />
        </div>
        <div className="border-highlight mt-4 border-l-2 pl-3">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-4"
            widthClassName="w-[min(100%,22rem)]"
          />
        </div>
      </div>
    </section>
  );
}

export function ThreadRulerSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-label">Réglette de charge</p>
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-20" />
      </div>

      <div className="chip-surface-lg rounded-analysis-lg px-3 py-3">
        <div className="flex h-16 items-end gap-1.5" aria-hidden>
          {RULER_BAR_HEIGHTS.slice(0, RULER_WINDOW).map((height, index) => (
            <div
              key={index}
              className="bg-muted/60 flex-1 animate-pulse rounded-[3px]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <p className="text-muted-foreground mt-1.5 text-[11px]">
        Glisse pour te déplacer dans la saison. Plein = réalisé, pointillé = prévu.
      </p>
    </div>
  );
}

export function ThreadTimelineSkeleton() {
  return (
    <div>
      <div className="mb-2 flex justify-end px-0.5">
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
      </div>

      <div className="space-y-2">
        <Row />
        <Row wide />
      </div>

      {/* The waterline is structure, not data — it belongs on screen from the
          first frame, or the list has no shape until the fetch returns. */}
      <div className="my-3 flex items-center gap-3" aria-hidden>
        <span className="bg-primary/40 h-0.5 flex-1 rounded-full" />
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-32" />
        <span className="bg-primary/40 h-0.5 flex-1 rounded-full" />
      </div>

      <div className="space-y-2">
        <Row wide />
        <Row />
        <Row wide />
      </div>
    </div>
  );
}

export function ThreadRailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <section className="chip-surface-lg rounded-analysis-lg px-4 py-4">
        <p className="text-label">Prévu vs réalisé · 8 semaines</p>
        <div className="mt-3 flex h-24 items-end gap-1.5" aria-hidden>
          {RULER_BAR_HEIGHTS.slice(0, 8).map((height, index) => (
            <div
              key={index}
              className="bg-muted/60 flex-1 animate-pulse rounded-[3px]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-2.5">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-44" />
        </div>
      </section>

      <section>
        <p className="text-label mb-2">Ta forme</p>
        <ul className="chip-surface-lg rounded-analysis-lg divide-analysis-border/50 divide-y">
          {['w-24', 'w-20', 'w-28'].map((width) => (
            <li key={width} className="flex min-h-11 items-center gap-3 px-3.5 py-2.5">
              <SkeletonDataValue heightClassName="h-3.5" widthClassName={width} />
              <span className="ml-auto">
                <SkeletonDataValue heightClassName="h-3.5" widthClassName="w-16" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * The whole page, for the Suspense boundary above the client view.
 *
 * Same tree again — the route's fallback used to be one grey block, so the first
 * paint and the second disagreed about what page this was.
 */
export function ThreadPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="py-3 lg:py-4">
        <p className="text-label">Ma semaine</p>
        <h1 className="text-page-title mt-1">Le fil</h1>
      </div>

      <ThreadGoalBannerSkeleton />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          <ThreadRulerSkeleton />
          <ThreadTimelineSkeleton />
        </div>
        <ThreadRailSkeleton className="hidden lg:block" />
      </div>
    </div>
  );
}
