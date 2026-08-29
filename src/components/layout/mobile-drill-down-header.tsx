import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { cn } from '@/lib/utils';

/**
 * Drill-down header — the way back stays reachable at any scroll depth.
 *
 * Mobile pins the back button to the viewport as a floating, frosted-glass
 * control (iOS-style: no bar, no bg on the row it sits in) so it never
 * masks the title or banner beneath it; the row below only reserves the
 * gutter it needs (`max-lg:pt-14`), not a full-width band. Desktop leaves it
 * inline and sticks through the shared `StickyHeader`, which fades a blur in
 * only once the page has actually moved.
 *
 * `rounded-full` here is a deliberate exception to DESIGN_LANGUAGE.md's
 * instrument `rounded-lg` button rule: this is floating nav chrome (toolbar
 * affordance), not a CTA, and every button sharing this row must read as one
 * circular family — mirrors mobile-back-link.tsx's chrome.
 */
export function MobileDrillDownHeader({
  title,
  backHref = '/',
  backLabel = "Aujourd'hui",
  className,
  titleBadge,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  /** Rendered next to the title — e.g. `<ExpertModeBadge />` on pages it affects. */
  titleBadge?: React.ReactNode;
}) {
  return (
    <StickyHeader className={cn('mb-3 space-y-1 max-lg:pt-14 lg:mb-4', className)}>
      <Link
        aria-label={backLabel}
        className="bg-background/70 text-foreground/70 hover:text-foreground hover:bg-background/85 fixed top-3 left-4 z-40 flex size-10 items-center justify-center rounded-full backdrop-blur-xl transition-colors lg:static lg:mb-3 lg:size-auto lg:justify-start lg:gap-1 lg:rounded-none lg:bg-transparent lg:px-0 lg:text-muted-foreground lg:backdrop-blur-none lg:hover:bg-transparent"
        href={backHref}
      >
        <ChevronLeft className="size-5 shrink-0 lg:size-4" aria-hidden />
        <span className="hidden text-sm lg:inline">{backLabel}</span>
      </Link>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-page-title">{title}</h1>
        {titleBadge}
      </div>
    </StickyHeader>
  );
}
