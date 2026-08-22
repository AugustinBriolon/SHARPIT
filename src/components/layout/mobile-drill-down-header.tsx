import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { cn } from '@/lib/utils';

/**
 * Drill-down header — the way back stays reachable at any scroll depth.
 *
 * Mobile pins the back link to the viewport; desktop used to leave it at the top
 * of the document, so scrolling into the charts stranded the athlete with no way
 * out but the browser. Desktop now sticks through the shared `StickyHeader`,
 * which fades a blur in only once the page has actually moved.
 */
export function MobileDrillDownHeader({
  title,
  backHref = '/',
  backLabel = "Aujourd'hui",
  className,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <StickyHeader className={cn('mb-3 space-y-1 pt-14 max-lg:py-0 lg:mb-4 lg:pt-0', className)}>
      <Link
        className="text-muted-foreground hover:text-foreground bg-background/80 fixed inset-x-0 top-0 z-40 flex min-h-14 items-center gap-1 px-4 text-sm backdrop-blur-xl transition-colors lg:static lg:min-h-11 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
        href={backHref}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="text-page-title">{title}</h1>
    </StickyHeader>
  );
}
