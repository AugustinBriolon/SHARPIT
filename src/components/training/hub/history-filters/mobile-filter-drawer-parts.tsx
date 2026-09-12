'use client';

import { SPORT_IDENTITY_SURFACE } from '@/lib/activity/sport-identity';
import { activityTypeLabels } from '@/lib/format';
import {
  DISTANCE_PRESETS_KM,
  DURATION_PRESETS,
  PERIOD_PRESETS,
  presetsInScope,
  rangeToPresetSelections,
  togglePresetSelection,
  type TrainingHistoryFilters,
} from '@/lib/training/periodization/history-filters';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';
import { Bike, Dumbbell, Footprints, Mountain, Trophy, Waves, Zap } from 'lucide-react';
import { FilterPresetRange } from './filter-preset-range';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
  ActivityType.HIKE,
  ActivityType.OTHER,
];

const SPORT_ICONS: Record<ActivityType, React.ElementType> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
  STRENGTH: Dumbbell,
  TRIATHLON: Trophy,
  HIKE: Mountain,
  OTHER: Zap,
};

export function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-label">{label}</h3>
      {children}
    </section>
  );
}

export function CircleDurationPresets({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const selected = rangeToPresetSelections(min, max, DURATION_PRESETS);
  const inScope = presetsInScope(selected, DURATION_PRESETS);

  function toggle(value: number) {
    const { min: nextMin, max: nextMax } = togglePresetSelection(selected, value, DURATION_PRESETS);
    onChange(nextMin, nextMax);
  }

  return (
    <div aria-label="Plage de durée" className="flex justify-start gap-4" role="group">
      {DURATION_PRESETS.map((value) => {
        const active = selected.includes(value);
        const scope = inScope.includes(value);
        return (
          <button
            key={value}
            aria-label={`${value} minutes`}
            aria-pressed={active}
            className="pressable flex min-h-11 flex-col items-center gap-1.5"
            type="button"
            onClick={() => toggle(value)}
          >
            <div
              className={cn(
                'flex size-14 flex-col items-center justify-center rounded-full border-1',
                active && 'border-highlight bg-highlight text-highlight-foreground',
                scope && !active && 'border-highlight/50 bg-highlight/20 text-foreground',
                !active && !scope && 'border-foreground/15 text-foreground',
              )}
              aria-hidden
            >
              <span className="text-data text-base font-semibold">{value}</span>
              <span className="text-muted-foreground text-data text-xs">min</span>
            </div>
            {scope && !active ? <span className="sr-only">, inclus dans la plage</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterTypeChips({
  filters,
  counts,
  onToggle,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onToggle: (type: ActivityType) => void;
}) {
  return (
    <div aria-label="Types d'activité" className="flex flex-wrap gap-2" role="group">
      {TYPE_ORDER.map((type) => {
        const count = counts[type];
        const active = filters.types.includes(type);
        const empty = count === 0;
        const Icon = SPORT_ICONS[type];
        let chipClass = 'border-foreground/15 text-muted-foreground border';
        if (empty) {
          chipClass = 'border-foreground/8 text-foreground/25 cursor-not-allowed border';
        } else if (active) {
          chipClass = SPORT_IDENTITY_SURFACE[type];
        }
        return (
          <button
            key={type}
            aria-pressed={active}
            disabled={empty}
            type="button"
            className={cn(
              'pressable inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium',
              chipClass,
            )}
            onClick={() => onToggle(type)}
          >
            <Icon className="size-3.5" aria-hidden />
            {activityTypeLabels[type]}
            <span className="text-data text-xs opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FilterDrawerBody({
  filters,
  counts,
  onApply,
  onToggleType,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
  onToggleType: (type: ActivityType) => void;
}) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
      <DrawerSection label="Type">
        <FilterTypeChips counts={counts} filters={filters} onToggle={onToggleType} />
      </DrawerSection>

      <DrawerSection label="Durée">
        <CircleDurationPresets
          max={filters.durationMaxMin}
          min={filters.durationMinMin}
          onChange={(min, max) => onApply({ ...filters, durationMinMin: min, durationMaxMin: max })}
        />
      </DrawerSection>

      <DrawerSection label="Période">
        <FilterPresetRange
          ariaLabel="Plage de période"
          formatLabel={(v) => (v === 365 ? '12 m' : `${v} j`)}
          max={filters.periodMaxDays}
          min={filters.periodMinDays}
          presets={PERIOD_PRESETS}
          suffix="j"
          onChange={(min, max) => onApply({ ...filters, periodMinDays: min, periodMaxDays: max })}
        />
      </DrawerSection>

      <DrawerSection label="Distance">
        <FilterPresetRange
          ariaLabel="Plage de distance"
          max={filters.distanceMaxKm}
          min={filters.distanceMinKm}
          presets={DISTANCE_PRESETS_KM}
          suffix="km"
          onChange={(min, max) => onApply({ ...filters, distanceMinKm: min, distanceMaxKm: max })}
        />
      </DrawerSection>
    </div>
  );
}
