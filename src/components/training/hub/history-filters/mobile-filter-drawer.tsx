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
} from '@/lib/training/history-filters';
import { cn } from '@/lib/utils';
import { Drawer } from '@base-ui/react/drawer';
import { ActivityType } from '@prisma/client';
import { Bike, Dumbbell, Footprints, Mountain, Trophy, Waves, X, Zap } from 'lucide-react';
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

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-label">{label}</h3>
      {children}
    </section>
  );
}

// ─── Circular duration presets (Mobile ref pattern) ───────────────────────────

function CircleDurationPresets({
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

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function MobileFilterDrawer({
  open,
  filters,
  counts,
  onApply,
  onOpenChange,
}: {
  open: boolean;
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
  onOpenChange: (open: boolean) => void;
}) {
  function toggleType(type: ActivityType) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onApply({
      ...filters,
      types: next,
      distanceMinKm: null,
      distanceMaxKm: null,
    });
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'bg-foreground/40 fixed inset-0 z-60',
            'transition-opacity duration-250 ease-out',
            'data-closed:opacity-0 data-closed:duration-150',
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
          <Drawer.Popup
            id="history-filter-drawer"
            className={cn(
              'bg-background flex max-h-[92dvh] flex-col rounded-t-2xl',
              'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'starting:translate-y-full',
              'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden>
              <div className="bg-foreground/20 h-1 w-10 rounded-full" />
            </div>

            {/* Header */}
            <div className="border-foreground/8 flex items-center justify-between border-b px-4 py-3">
              <Drawer.Title className="text-sm font-semibold">Filtres</Drawer.Title>
              <Drawer.Close
                render={
                  <button
                    aria-label="Fermer"
                    className="text-muted-foreground hover:text-foreground pressable inline-flex size-11 items-center justify-center rounded-lg"
                    type="button"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                }
              />
            </div>

            {/* Scrollable body — immediate apply on each interaction */}
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
              {/* 1. Type */}
              <DrawerSection label="Type">
                <div aria-label="Types d'activité" className="flex flex-wrap gap-2" role="group">
                  {TYPE_ORDER.map((type) => {
                    const count = counts[type];
                    const active = filters.types.includes(type);
                    const empty = count === 0;
                    const Icon = SPORT_ICONS[type];
                    let chipClass = 'border-foreground/15 text-muted-foreground border';
                    if (empty) {
                      chipClass =
                        'border-foreground/8 text-foreground/25 cursor-not-allowed border';
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
                        onClick={() => toggleType(type)}
                      >
                        <Icon className="size-3.5" aria-hidden />
                        {activityTypeLabels[type]}
                        <span className="text-data text-xs opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </DrawerSection>

              <DrawerSection label="Durée">
                <CircleDurationPresets
                  max={filters.durationMaxMin}
                  min={filters.durationMinMin}
                  onChange={(min, max) =>
                    onApply({ ...filters, durationMinMin: min, durationMaxMin: max })
                  }
                />
              </DrawerSection>

              {/* 3. Période */}
              <DrawerSection label="Période">
                <FilterPresetRange
                  ariaLabel="Plage de période"
                  formatLabel={(v) => (v === 365 ? '12 m' : `${v} j`)}
                  max={filters.periodMaxDays}
                  min={filters.periodMinDays}
                  presets={PERIOD_PRESETS}
                  suffix="j"
                  onChange={(min, max) =>
                    onApply({ ...filters, periodMinDays: min, periodMaxDays: max })
                  }
                />
              </DrawerSection>

              {/* 4. Distance — toujours visible */}
              <DrawerSection label="Distance">
                <FilterPresetRange
                  ariaLabel="Plage de distance"
                  max={filters.distanceMaxKm}
                  min={filters.distanceMinKm}
                  presets={DISTANCE_PRESETS_KM}
                  suffix="km"
                  onChange={(min, max) =>
                    onApply({ ...filters, distanceMinKm: min, distanceMaxKm: max })
                  }
                />
              </DrawerSection>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
