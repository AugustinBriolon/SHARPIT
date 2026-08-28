'use client';

import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export type PreferenceOption<TId extends string> = {
  id: TId;
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * The settings radio pattern — one card per option, arrow-key roving focus.
 *
 * Pure: it renders the options it is given and reports the choice. Where the
 * preference is stored is the caller's business.
 */
export function PreferenceRadioGroup<TId extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly PreferenceOption<TId>[];
  value: TId;
  onChange: (id: TId) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        selectAt((index + 1) % options.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        selectAt((index - 1 + options.length) % options.length);
        break;
      case 'Home':
        event.preventDefault();
        selectAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectAt(options.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        selectAt(index);
        break;
      default:
        break;
    }
  }

  return (
    <div aria-label={label} className="space-y-3" role="radiogroup">
      {options.map((option, index) => {
        const Icon = option.icon;
        const active = value === option.id;
        return (
          <button
            key={option.id}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            aria-checked={active}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
            className={cn(
              'analysis-panel rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 w-full px-4 py-4 text-left focus-visible:ring-2 focus-visible:outline-hidden',
              active ? 'border-highlight bg-highlight/30' : 'hover:bg-analysis-surface-alt/80',
            )}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => onRadioKeyDown(event, index)}
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
                <p className="text-sm font-medium">{option.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{option.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
