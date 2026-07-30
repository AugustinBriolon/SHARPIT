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
  ariaLabel,
}: {
  presets: readonly number[];
  suffix: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  formatLabel?: (value: number) => string;
  ariaLabel: string;
}) {
  const selected = rangeToPresetSelections(min, max, presets);

  function toggle(value: number) {
    const { min: nextMin, max: nextMax } = togglePresetSelection(selected, value, presets);
    onChange(nextMin, nextMax);
  }

  const label = formatLabel ?? ((v: number) => `${v} ${suffix}`);

  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-1.5" role="group">
      {presets.map((value) => {
        const state = getVisualState(value, selected, presets);
        return (
          <button
            key={value}
            aria-pressed={state === 'selected'}
            type="button"
            className={cn(
              'min-h-11 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              state === 'selected' && 'bg-highlight text-highlight-foreground',
              state === 'in-scope' && 'bg-highlight/30 text-foreground',
              state === 'idle' &&
                'border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground border whitespace-nowrap',
            )}
            onClick={() => toggle(value)}
          >
            {label(value)}
            {state === 'in-scope' ? <span className="sr-only">, inclus dans la plage</span> : null}
          </button>
        );
      })}
    </div>
  );
}
