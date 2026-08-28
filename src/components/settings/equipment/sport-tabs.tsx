'use client';

import { useRef } from 'react';
import { EQUIPMENT_SPORT_LABELS, type EquipmentSport } from '@/lib/equipment/catalog';
import { cn } from '@/lib/utils';
import { Bike, Dumbbell, Footprints, StretchHorizontal, Waves } from 'lucide-react';

const SPORT_TABS: {
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
}: {
  sport: EquipmentSport;
  onSportChange: (sport: EquipmentSport) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusOption(index: number) {
    const clamped = Math.max(0, Math.min(SPORT_TABS.length - 1, index));
    optionRefs.current[clamped]?.focus();
  }

  function selectAt(index: number) {
    const option = SPORT_TABS[index];
    if (!option) {
      return;
    }
    onSportChange(option.id);
    focusOption(index);
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        selectAt((index + 1) % SPORT_TABS.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        selectAt((index - 1 + SPORT_TABS.length) % SPORT_TABS.length);
        break;
      case 'Home':
        event.preventDefault();
        selectAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectAt(SPORT_TABS.length - 1);
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
    <div
      aria-label="Sport"
      className="bg-muted/45 no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full p-1"
      role="radiogroup"
    >
      {SPORT_TABS.map(({ id, label, icon: Icon }, index) => {
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
