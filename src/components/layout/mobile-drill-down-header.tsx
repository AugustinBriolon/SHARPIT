import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { cn } from '@/lib/utils';

/**
 * Drill-down header — the way back stays reachable at any scroll depth.
 *
 * Mobile pins the back button via `MobileBackLink` (liquid-glass chrome +
 * app nav stack). Empty-stack parent comes from the route registry (Today
 * children → Aujourd’hui) unless the caller passes an explicit fallback pair.
 * Never hard-code a fixed hub here.
 */
export function MobileDrillDownHeader({
  title,
  backHref,
  backLabel,
  className,
  titleBadge,
}: {
  title: string;
  /** Empty-stack override; omit to use the route registry. */
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
