'use client';

import { ActivityType } from '@prisma/client';
import { Drawer } from '@base-ui/react/drawer';
import { Bike, Dumbbell, Footprints, Trophy, Waves, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TRAINING_HISTORY_FILTERS,
  DISTANCE_PRESETS_KM,
  DURATION_PRESETS,
  PERIOD_PRESETS,
  presetsInScope,
  TRIATHLON_FORMAT_LABELS,
  TRIATHLON_FORMATS,
  togglePresetSelection,
  type TrainingHistoryFilters,
  rangeToPresetSelections,
} from '@/lib/training/history-filters';
import { activityTypeLabels } from '@/lib/format';
import { SPORT_IDENTITY_SURFACE } from '@/lib/activity/sport-identity';
import { FilterPresetRange } from './filter-preset-range';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
  ActivityType.OTHER,
];

const SPORT_ICONS: Record<ActivityType, React.ElementType> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
  STRENGTH: Dumbbell,
  TRIATHLON: Trophy,
  OTHER: Zap,
};

// Override OTHER to avoid invisible selected state on light bg
const TYPE_ACTIVE_CLASS: Record<ActivityType, string> = {
  ...SPORT_IDENTITY_SURFACE,
  OTHER: 'bg-foreground/10 text-foreground',
};

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-label">{label}</p>
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
    <div className="flex justify-start gap-4">
      {DURATION_PRESETS.map((value) => {
        const active = selected.includes(value);
        const scope = inScope.includes(value);
        return (
          <button
            key={value}
            aria-pressed={active}
            className="flex flex-col items-center gap-1.5"
            type="button"
            onClick={() => toggle(value)}
          >
            <div
              className={cn(
                'flex size-14 flex-col items-center justify-center rounded-full border-2 transition-colors',
                active && 'border-highlight bg-highlight text-highlight-foreground',
                scope && !active && 'border-highlight/50 bg-highlight/20 text-foreground',
              )}
            >
              <span className="text-base font-semibold">{value}</span>
              <span className="text-muted-foreground text-[8px]">min</span>
            </div>
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
  const isTriathlonOnly = filters.types.length === 1 && filters.types[0] === ActivityType.TRIATHLON;

  function toggleType(type: ActivityType) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onApply({
      ...filters,
      types: next,
      distanceMinKm: null,
      distanceMaxKm: null,
      triathlonFormats: [],
    });
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'fixed inset-0 z-60 bg-black/40',
            'transition-opacity duration-300',
            'data-closed:opacity-0 data-closed:duration-200',
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
          <Drawer.Popup
            className={cn(
              'bg-background flex max-h-[92dvh] flex-col rounded-t-2xl',
              'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'starting:translate-y-full',
              'data-closed:translate-y-full data-closed:duration-200 data-closed:ease-in',
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="bg-foreground/20 h-1 w-10 rounded-full" />
            </div>

            {/* Header */}
            <div className="border-foreground/8 flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Filtres</p>
              <Drawer.Close
                render={
                  <button
                    aria-label="Fermer"
                    className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                }
              />
            </div>

            {/* Scrollable body — immediate apply on each interaction */}
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
              {/* 1. Type */}
              <DrawerSection label="Type">
                <div className="flex flex-wrap gap-2">
                  {TYPE_ORDER.map((type) => {
                    const count = counts[type];
                    const active = filters.types.includes(type);
                    const empty = count === 0;
                    const Icon = SPORT_ICONS[type];
                    let chipClass = 'border-foreground/15 text-muted-foreground border';
                    if (empty)
                      chipClass =
                        'border-foreground/8 text-foreground/25 cursor-not-allowed border';
                    else if (active) chipClass = TYPE_ACTIVE_CLASS[type];
                    return (
                      <button
                        key={type}
                        aria-pressed={active}
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                          chipClass,
                        )}
                        onClick={() => !empty && toggleType(type)}
                      >
                        <Icon className="size-3.5" />
                        {activityTypeLabels[type]}
                        <span className="text-xs opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </DrawerSection>

              {/* 2. Durée (ou Format triathlon) */}
              {isTriathlonOnly ? (
                <DrawerSection label="Format">
                  <div className="flex flex-wrap gap-2">
                    {TRIATHLON_FORMATS.map((fmt) => {
                      const active = filters.triathlonFormats.includes(fmt);
                      return (
                        <button
                          key={fmt}
                          aria-pressed={active}
                          type="button"
                          className={cn(
                            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-highlight text-highlight-foreground'
                              : 'border-foreground/15 text-muted-foreground border',
                          )}
                          onClick={() => {
                            const next = filters.triathlonFormats.includes(fmt)
                              ? filters.triathlonFormats.filter((f) => f !== fmt)
                              : [...filters.triathlonFormats, fmt];
                            onApply({ ...filters, triathlonFormats: next });
                          }}
                        >
                          {TRIATHLON_FORMAT_LABELS[fmt]}
                        </button>
                      );
                    })}
                  </div>
                </DrawerSection>
              ) : (
                <DrawerSection label="Durée">
                  <CircleDurationPresets
                    max={filters.durationMaxMin}
                    min={filters.durationMinMin}
                    onChange={(min, max) =>
                      onApply({ ...filters, durationMinMin: min, durationMaxMin: max })
                    }
                  />
                </DrawerSection>
              )}

              {/* 3. Période */}
              <DrawerSection label="Période">
                <FilterPresetRange
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

            {/* Footer */}
            <div className="border-foreground/8 border-t px-4 py-4">
              <button
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                type="button"
                onClick={() => {
                  onApply(DEFAULT_TRAINING_HISTORY_FILTERS);
                  onOpenChange(false);
                }}
              >
                Tout effacer
              </button>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
