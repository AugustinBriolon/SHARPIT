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
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
    active
      ? 'border-foreground/12 bg-foreground/6 text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]'
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
  return (
    <div
      aria-label="Sport"
      className="bg-muted/45 no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full p-1"
      role="tablist"
    >
      {SPORT_TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          aria-selected={sport === id}
          className={sportSwitcherClass(sport === id)}
          role="tab"
          type="button"
          onClick={() => onSportChange(id)}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
