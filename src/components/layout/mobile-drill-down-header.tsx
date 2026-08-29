import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { floatingHeaderButtonClass } from '@/components/layout/floating-header-button';
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
 * The back button shares its chrome with `MobileBackLink` and the activity
 * detail actions trigger via `floatingHeaderButtonClass` — one definition
 * for every floating header button in the app (see DESIGN_LANGUAGE.md
 * exception note there).
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
        className={cn(
          floatingHeaderButtonClass('left'),
          'lg:mb-3 lg:justify-start lg:gap-1 lg:px-0 lg:text-muted-foreground',
        )}
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
