'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import type { ActivityType } from '@prisma/client';
import { CheckCircle2 } from 'lucide-react';

import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { STATUS_SURFACE } from '@/lib/presentation/status-surface';
import { cn } from '@/lib/utils';

export type InstrumentListChipMeta = string | { text: string; tone?: 'default' | 'caution' };

export type InstrumentListChipProps = {
  /** Route navigation. Omit when using `onClick` (in-place modal). */
  href?: string;
  /** In-place action (e.g. open planned-session modal). Prefer over href when set alone. */
  onClick?: () => void;
  title: string;
  activityType?: ActivityType;
  /** Facts under the title — type label is prepended when `activityType` is set. */
  meta?: InstrumentListChipMeta[];
  /** Completed session surface + check mark. */
  done?: boolean;
  /** Primary element of the day — → affordance becomes a Lime Pulse pastille. */
  primary?: boolean;
  /** Hide the trailing → (history chips end on their check icon). */
  showArrow?: boolean;
  /** Extra trailing control before the → affordance. */
  trailing?: ReactNode;
  className?: string;
  linkTitle?: string;
  onFocus?: () => void;
  onPointerEnter?: () => void;
};

function metaText(item: InstrumentListChipMeta): string {
  return typeof item === 'string' ? item : item.text;
}

function metaTone(item: InstrumentListChipMeta): 'default' | 'caution' {
  return typeof item === 'string' ? 'default' : (item.tone ?? 'default');
}

/** Split a pre-joined “a · b · c” secondary line into chip meta parts. */
export function splitInstrumentMeta(secondary: string | null | undefined): string[] {
  if (!secondary?.trim()) return [];
  return secondary
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
}

const chipClassName = (done: boolean, className?: string) =>
  cn(
    'chip-surface hover:border-primary/35',
    'focus-visible:ring-primary/35 flex w-full min-w-0 items-center justify-between gap-3',
    'rounded-analysis px-3 py-3 text-left transition-[border-color,background-color] duration-150',
    'group focus-visible:ring-2 focus-visible:outline-hidden',
    done && cn(STATUS_SURFACE.doneSoft, STATUS_SURFACE.doneHover),
    className,
  );

/** Same surface/shape as a loaded row — placeholder for title + meta line only. */
export function InstrumentListChipSkeleton({ titleWidth = 'w-40' }: { titleWidth?: string }) {
  return (
    <div
      className="chip-surface rounded-analysis flex w-full min-w-0 items-center justify-between gap-3 px-3 py-3"
      aria-hidden
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <SkeletonDataValue heightClassName="h-3.5" widthClassName={titleWidth} />
        <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-24" />
      </span>
      <SkeletonDataValue className="rounded-full" heightClassName="h-3.5" widthClassName="w-3.5" />
    </div>
  );
}

/**
 * Shared drill-down list chip — training previews + Today “Séance du jour”.
 * Two-line instrument layout: title, then type · meta facts.
 */
export const InstrumentListChip = memo(function InstrumentListChip({
  href,
  onClick,
  title,
  activityType,
  meta = [],
  done = false,
  primary = false,
  showArrow = true,
  trailing,
  className,
  linkTitle,
  onFocus,
  onPointerEnter,
}: InstrumentListChipProps) {
  const hasMetaRow = activityType != null || meta.length > 0;
  const label = linkTitle ?? `Voir le détail — ${title}`;

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-foreground line-clamp-1 min-w-0 text-sm leading-snug font-medium">
          {title}
        </span>
        {hasMetaRow ? (
          <span className="text-muted-foreground flex min-w-0 items-center gap-x-1.5 overflow-hidden text-[11px] whitespace-nowrap">
            {activityType != null ? <ActivityTypeIndicator type={activityType} /> : null}
            {meta.map((item, index) => (
              <span key={`meta-${index}-${metaText(item)}`} className="contents">
                {activityType != null || index > 0 ? (
                  <span className="shrink-0 opacity-30" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span
                  className={cn(
                    'text-data shrink-0',
                    metaTone(item) === 'caution' && 'text-signal-caution',
                  )}
                >
                  {metaText(item)}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {done ? <CheckCircle2 className="text-primary size-3.5" aria-hidden /> : null}
        {trailing}
        {primary && !done ? (
          <span
            className="bg-highlight text-highlight-foreground text-data inline-flex size-[26px] items-center justify-center rounded-full text-[11px] transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            →
          </span>
        ) : null}
        {showArrow && !(primary && !done) ? (
          <span
            className="text-muted-foreground/70 text-data text-[10px] tracking-wider transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            →
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick && !href) {
    return (
      <button
        className={chipClassName(done, className)}
        title={label}
        type="button"
        onClick={onClick}
        onFocus={onFocus}
        onPointerEnter={onPointerEnter}
      >
        {body}
      </button>
    );
  }

  if (!href) {
    throw new Error('InstrumentListChip requires `href` or `onClick`');
  }

  return (
    <Link
      className={chipClassName(done, className)}
      href={href}
      title={label}
      onClick={onClick}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {body}
    </Link>
  );
});
