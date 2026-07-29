'use client';

import { cn } from '@/lib/utils';
import {
  presetsInScope,
  rangeToPresetSelections,
  togglePresetSelection,
} from '@/lib/training/history-filters';

type VisualState = 'selected' | 'in-scope' | 'idle';

function getVisualState(
  value: number,
  selected: number[],
  presets: readonly number[],
): VisualState {
  if (selected.includes(value)) return 'selected';
  if (presetsInScope(selected, presets).includes(value)) return 'in-scope';
  return 'idle';
}

export function FilterPresetRange({
  presets,
  suffix,
  min,
  max,
  onChange,
  formatLabel,
}: {
  presets: readonly number[];
  suffix: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  formatLabel?: (value: number) => string;
}) {
  const selected = rangeToPresetSelections(min, max, presets);

  function toggle(value: number) {
    const { min: nextMin, max: nextMax } = togglePresetSelection(selected, value, presets);
    onChange(nextMin, nextMax);
  }

  const label = formatLabel ?? ((v: number) => `${v} ${suffix}`);

  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((value) => {
        const state = getVisualState(value, selected, presets);
        return (
          <button
            key={value}
            aria-pressed={state === 'selected'}
            type="button"
            className={cn(
              'min-h-11 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:min-h-0',
              state === 'selected' && 'bg-highlight text-highlight-foreground',
              state === 'in-scope' && 'bg-highlight/30 text-foreground',
              state === 'idle' &&
                'border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground border',
            )}
            onClick={() => toggle(value)}
          >
            {label(value)}
          </button>
        );
      })}
    </div>
  );
}
