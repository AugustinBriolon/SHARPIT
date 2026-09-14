'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const optionClass = (active: boolean) =>
  cn(
    'rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 w-full border px-4 py-4 text-left focus-visible:ring-2 focus-visible:outline-hidden',
    active
      ? 'border-highlight bg-highlight/30'
      : 'border-analysis-border bg-analysis-surface hover:bg-analysis-surface-alt/80',
  );

export function PreferenceRadioOption({
  title,
  description,
  icon: Icon,
  active,
  tabIndex,
  onSelect,
  onKeyDown,
  setRef,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
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
      className={optionClass(active)}
      role="radio"
      tabIndex={tabIndex}
      type="button"
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl',
            active ? 'icon-well' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
}
