'use client';

import { memo, type ReactNode } from 'react';
import type { ActivityType } from '@prisma/client';

import { InstrumentListChipSurface } from '@/components/ui/instruments/instrument-list-chip-surface';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

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

/** Split a pre-joined “a · b · c” secondary line into chip meta parts. */
export function splitInstrumentMeta(secondary: string | null | undefined): string[] {
  if (!secondary?.trim()) {
    return [];
  }
  return secondary
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
}

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
export const InstrumentListChip = memo(function InstrumentListChip(props: InstrumentListChipProps) {
  return <InstrumentListChipSurface {...props} />;
});
