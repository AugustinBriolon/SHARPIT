import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { chipDot, chipIconTone, chipLinkSurface } from './activity-detail-helpers';
import type { ChipTone } from './types';

const DEFAULT_LINK_SURFACE =
  'border-analysis-border/80 bg-analysis-surface-alt/50 hover:border-primary/35 hover:bg-analysis-surface-alt';

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
      {showDot ? <span className={cn('size-1.5 shrink-0 rounded-full', chipDot[tone!])} /> : iconEl}
      <span className="min-w-0">
        <span className="text-muted-foreground block text-[10px] leading-none font-medium tracking-wide">
          {label}
        </span>
        <span className="text-foreground mt-0.5 block text-xs leading-snug font-semibold wrap-break-word">
          {value}
        </span>
      </span>
    </>
  );
}

function ActivityMetaChipShell({
  chipClass,
  href,
  onClick,
  onPointerEnter,
  children,
}: {
  chipClass: string;
  href?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}) {
  if (onClick) {
    return (
      <button className={chipClass} type="button" onClick={onClick} onPointerEnter={onPointerEnter}>
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

/**
 * Instrument chip — quiet label over bold value, wrap-safe radius.
 * Reading this as: product density for athlete scan, not marketing pills.
 */
export function ActivityMetaChip({
  href,
  onClick,
  onPointerEnter,
  icon: Icon,
  label,
  value,
  tone,
  iconClassName,
}: {
  href?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
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
  const chipClass = cn(
    'inline-flex max-w-full shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left',
    'min-h-11 lg:min-h-9 lg:py-1.5',
    href || onClick
      ? cn('pressable', linkSurface)
      : 'border-analysis-border/70 bg-analysis-surface',
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
    <ActivityMetaChipShell
      chipClass={chipClass}
      href={href}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
    >
      {content}
    </ActivityMetaChipShell>
  );
}
