import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { chipDot, chipIconTone, chipLinkSurface } from './activity-detail-helpers';
import type { ChipTone } from './types';

const DEFAULT_LINK_SURFACE =
  'border-primary/30 bg-muted/20 hover:border-primary/50 hover:bg-muted/50';

export function ActivityMetaChip({
  href,
  icon: Icon,
  label,
  value,
  tone,
  iconClassName,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: ChipTone;
  iconClassName?: string;
}) {
  const showDot = Boolean(tone && !iconClassName);
  const resolvedIconClass = iconClassName ?? (tone ? chipIconTone[tone] : 'text-muted-foreground');
  const iconEl = <Icon className={cn('size-3.5 shrink-0', resolvedIconClass)} />;

  const linkSurface = tone ? chipLinkSurface[tone] : DEFAULT_LINK_SURFACE;

  return href ? (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
        linkSurface,
      )}
    >
      {showDot ? <span className={cn('size-2 rounded-full', chipDot[tone!])} /> : iconEl}
      <span className="text-muted-foreground font-medium tracking-wider uppercase">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </Link>
  ) : (
    <span className="border-analysis-border bg-analysis-surface inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
      {tone && !iconClassName ? (
        <span className={cn('size-2 rounded-full', chipDot[tone])} />
      ) : (
        iconEl
      )}
      <span className="text-muted-foreground font-medium tracking-wider uppercase">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}
