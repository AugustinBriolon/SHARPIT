'use client';

import { useRef } from 'react';
import { STRENGTH_VENUE_OPTIONS, type StrengthVenue } from '@/lib/equipment/catalog';
import {
  StrengthVenueOption,
  strengthVenueTabIndex,
} from '@/components/settings/equipment/strength-venue-option';
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
      {STRENGTH_VENUE_OPTIONS.map((option, index) => (
        <StrengthVenueOption
          key={option.id}
          active={value === option.id}
          description={option.description}
          tabIndex={strengthVenueTabIndex(value, option.id, index)}
          title={option.title}
          setRef={(node) => {
            optionRefs.current[index] = node;
          }}
          onKeyDown={(event) => onRadioKeyDown(event, index)}
          onSelect={() => onSelect(option.id)}
        />
      ))}
    </div>
  );
}
