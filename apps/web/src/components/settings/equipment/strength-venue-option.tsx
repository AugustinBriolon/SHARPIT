'use client';

import { cn } from '@sharpit/server/lib/utils';
import type { StrengthVenue } from '@sharpit/server/lib/equipment/catalog';

export function StrengthVenueOption({
  title,
  description,
  active,
  tabIndex,
  onSelect,
  onKeyDown,
  setRef,
}: {
  title: string;
  description: string;
  active: boolean;
  tabIndex: number;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  setRef: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={setRef}
      aria-checked={active}
      role="radio"
      tabIndex={tabIndex}
      type="button"
      className={cn(
        'rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 w-full border px-3.5 py-3 text-left focus-visible:ring-2 focus-visible:outline-hidden',
        active
          ? 'border-highlight bg-highlight/30'
          : 'border-analysis-border bg-analysis-surface hover:bg-analysis-surface-alt/80',
      )}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
    </button>
  );
}

export function strengthVenueTabIndex(
  value: StrengthVenue | null,
  optionId: StrengthVenue,
  index: number,
): number {
  const active = value === optionId;
  return active || (value === null && index === 0) ? 0 : -1;
}
