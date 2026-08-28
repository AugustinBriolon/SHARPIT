'use client';

import { useRef } from 'react';
import { STRENGTH_VENUE_OPTIONS, type StrengthVenue } from '@/lib/equipment/catalog';
import { cn } from '@/lib/utils';
import { handleRadioGroupKeyDown } from '@/components/settings/equipment/radio-group-keydown';

export function StrengthVenuePicker({
  value,
  onSelect,
}: {
  value: StrengthVenue | null;
  onSelect: (venue: StrengthVenue) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(STRENGTH_VENUE_OPTIONS.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = STRENGTH_VENUE_OPTIONS[index];
    if (!option) {
      return;
    }
    onSelect(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    handleRadioGroupKeyDown(event, index, STRENGTH_VENUE_OPTIONS.length, selectAt);
  }

  return (
    <div aria-label="Lieu de musculation" className="space-y-2" role="radiogroup">
      <p className="text-sm font-medium">Où t&apos;entraînes-tu en musculation ?</p>
      {STRENGTH_VENUE_OPTIONS.map((option, index) => {
        const active = value === option.id;
        const tabIndex = active || (value === null && index === 0) ? 0 : -1;
        return (
          <button
            key={option.id}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            aria-checked={active}
            role="radio"
            tabIndex={tabIndex}
            type="button"
            className={cn(
              'analysis-panel rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 w-full px-3.5 py-3 text-left focus-visible:ring-2 focus-visible:outline-hidden',
              active ? 'border-highlight bg-highlight/30' : 'hover:bg-analysis-surface-alt/80',
            )}
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => onRadioKeyDown(event, index)}
          >
            <p className="text-sm font-medium">{option.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
