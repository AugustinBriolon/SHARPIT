import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { chipDot, chipIconTone, chipLinkSurface } from './activity-detail-helpers';
import type { ChipTone } from './types';

const DEFAULT_LINK_SURFACE =
  'border-primary/30 bg-muted/20 hover:border-primary/50 hover:bg-muted/50';

function ActivityMetaChipBody({
  showDot,
  tone,
  iconEl,
  label,
  value,
}: {
  showDot: boolean;
  tone?: ChipTone;
  iconEl: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <>
      {showDot ? <span className={cn('size-2 shrink-0 rounded-full', chipDot[tone!])} /> : iconEl}
      <span className="text-muted-foreground shrink-0 font-medium tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground min-w-0 font-medium wrap-break-word">{value}</span>
    </>
  );
}

function ActivityMetaChipShell({
  chipClass,
  href,
  onClick,
  children,
}: {
  chipClass: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (onClick) {
    return (
      <button className={chipClass} type="button" onClick={onClick}>
        {children}
      </button>
    );
  }
  if (href) {
    return (
      <Link className={chipClass} href={href}>
        {children}
      </Link>
    );
  }
  return <span className={chipClass}>{children}</span>;
}

export function ActivityMetaChip({
  href,
  onClick,
  icon: Icon,
  label,
  value,
  tone,
  iconClassName,
}: {
  href?: string;
  onClick?: () => void;
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
  /** Same shell for static + interactive — Conformité must match Ressenti / Météo height. */
  const chipClass = cn(
    'inline-flex max-w-full shrink-0 min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs lg:min-h-9 lg:py-1.5',
    href || onClick ? cn('pressable', linkSurface) : 'border-analysis-border bg-analysis-surface',
  );

  const content = (
    <ActivityMetaChipBody
      iconEl={iconEl}
      label={label}
      showDot={showDot}
      tone={tone}
      value={value}
    />
  );

  return (
    <ActivityMetaChipShell chipClass={chipClass} href={href} onClick={onClick}>
      {content}
    </ActivityMetaChipShell>
  );
}
