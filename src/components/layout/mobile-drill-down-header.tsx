import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { cn } from '@/lib/utils';

/**
 * Drill-down header — the way back stays reachable at any scroll depth.
 *
 * Mobile pins the back button via `MobileBackLink` (liquid-glass chrome +
 * app nav stack). The link reserves its own mobile gutter (`h-16`). Desktop
 * keeps an inline labelled back through the same component.
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
    <StickyHeader className={cn('mb-3 space-y-1 lg:mb-4', className)}>
      <MobileBackLink fallbackHref={backHref} fallbackLabel={backLabel} showOnDesktop />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-page-title">{title}</h1>
        {titleBadge}
      </div>
    </StickyHeader>
  );
}
