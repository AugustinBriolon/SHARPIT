'use client';

import { useRef } from 'react';
import { EQUIPMENT_SPORT_LABELS, type EquipmentSport } from '@/lib/equipment/catalog';
import { cn } from '@/lib/utils';
import { Bike, Dumbbell, Footprints, StretchHorizontal, Waves } from 'lucide-react';
import { handleRadioGroupKeyDown } from '@/components/settings/equipment/radio-group-keydown';

const ALL_SPORT_TABS: {
  id: EquipmentSport;
  label: string;
  icon: typeof Footprints;
}[] = [
  { id: 'RUN', label: EQUIPMENT_SPORT_LABELS.RUN, icon: Footprints },
  { id: 'BIKE', label: EQUIPMENT_SPORT_LABELS.BIKE, icon: Bike },
  { id: 'SWIM', label: EQUIPMENT_SPORT_LABELS.SWIM, icon: Waves },
  { id: 'STRENGTH', label: EQUIPMENT_SPORT_LABELS.STRENGTH, icon: Dumbbell },
  { id: 'MOBILITY', label: EQUIPMENT_SPORT_LABELS.MOBILITY, icon: StretchHorizontal },
];

function sportSwitcherClass(active: boolean) {
  return cn(
    'pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-hidden lg:min-h-9 lg:px-2.5 lg:py-1.5',
    active
      ? 'border-foreground/12 bg-foreground/6 text-foreground'
      : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  );
}

export function EquipmentSportTabs({
  sport,
  onSportChange,
  availableSports,
}: {
  sport: EquipmentSport;
  onSportChange: (sport: EquipmentSport) => void;
  /** When set, only these tabs are shown (practiced-sports filter). */
  availableSports?: readonly EquipmentSport[];
}) {
  const tabs =
    availableSports && availableSports.length > 0
      ? ALL_SPORT_TABS.filter((tab) => availableSports.includes(tab.id))
      : ALL_SPORT_TABS;
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(tabs.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = tabs[index];
    if (!option) {
      return;
    }
    onSportChange(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    handleRadioGroupKeyDown(event, index, tabs.length, selectAt);
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Sport"
      className="bg-muted/45 no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full p-1"
      role="radiogroup"
    >
      {tabs.map(({ id, label, icon: Icon }, index) => {
        const active = sport === id;
        return (
          <button
            key={id}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            aria-checked={active}
            className={sportSwitcherClass(active)}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
            onClick={() => onSportChange(id)}
            onKeyDown={(event) => onRadioKeyDown(event, index)}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
