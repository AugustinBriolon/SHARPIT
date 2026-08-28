'use client';

import Link from 'next/link';
import type { InstrumentListChipProps } from '@/components/ui/instruments/instrument-list-chip';
import {
  InstrumentListChipMetaRow,
  InstrumentListChipTrailing,
} from '@/components/ui/instruments/instrument-list-chip-parts';
import { cn } from '@/lib/utils';
import { STATUS_SURFACE } from '@/lib/presentation/status-surface';

const chipClassName = (done: boolean, className?: string) =>
  cn(
    'chip-surface-lg',
    'focus-visible:ring-primary/35 flex w-full min-w-0 items-center justify-between gap-3',
    'rounded-analysis px-3 py-3 text-left transition-[border-color,background-color,transform] duration-150',
    'group focus-visible:ring-2 focus-visible:outline-hidden',
    done && cn(STATUS_SURFACE.doneSoft, STATUS_SURFACE.doneHover),
    className,
  );

function InstrumentListChipBody({
  title,
  activityType,
  meta,
  done,
  primary,
  showArrow,
  trailing,
}: Pick<
  InstrumentListChipProps,
  'title' | 'activityType' | 'meta' | 'done' | 'primary' | 'showArrow' | 'trailing'
>) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-foreground line-clamp-1 min-w-0 text-sm leading-snug font-medium">
          {title}
        </span>
        <InstrumentListChipMetaRow activityType={activityType} meta={meta ?? []} />
      </span>
      <InstrumentListChipTrailing
        done={done ?? false}
        primary={primary ?? false}
        showArrow={showArrow ?? true}
        trailing={trailing}
      />
    </>
  );
}

export function InstrumentListChipSurface({
  href,
  onClick,
  title,
  activityType,
  meta,
  done = false,
  primary = false,
  showArrow = true,
  trailing,
  className,
  linkTitle,
  onFocus,
  onPointerEnter,
}: InstrumentListChipProps) {
  const label = linkTitle ?? `Voir le détail — ${title}`;
  const body = (
    <InstrumentListChipBody
      activityType={activityType}
      done={done}
      meta={meta}
      primary={primary}
      showArrow={showArrow}
      title={title}
      trailing={trailing}
    />
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
}
