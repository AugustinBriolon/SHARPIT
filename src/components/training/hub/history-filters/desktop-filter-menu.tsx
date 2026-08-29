'use client';

import { activityTypeLabels } from '@/lib/format';
import {
  countDimensionSelections,
  DISTANCE_PRESETS_KM,
  DURATION_PRESETS,
  PERIOD_PRESETS,
  presetSelectionsToRange,
  presetsInScope,
  rangeToPresetSelections,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';
import { Calendar, Check, ChevronRight, Ruler, Timer, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
  ActivityType.HIKE,
  ActivityType.OTHER,
];

type Section = 'types' | 'period' | 'duration' | 'distance';

// ─── Shared row option renderer ───────────────────────────────────────────────

type RowOption = {
  value: string | number;
  label: string;
  extra?: React.ReactNode;
  disabled?: boolean;
};

function OptionSelectionMark({ active, inScope }: { active: boolean; inScope: boolean }) {
  if (active) {
    return <Check className="text-foreground size-3.5 shrink-0" aria-hidden />;
  }
  if (inScope) {
    return (
      <span
        className="border-foreground/40 bg-foreground/10 size-3.5 shrink-0 rounded-full border"
        aria-hidden
      />
    );
  }
  return (
    <span className="border-foreground/20 size-3.5 shrink-0 rounded-full border" aria-hidden />
  );
}

function OptionRows({
  options,
  selected,
  inScope,
  onToggle,
}: {
  options: RowOption[];
  selected: (string | number)[];
  inScope?: (string | number)[];
  onToggle: (value: string | number) => void;
}) {
  return (
    <div>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const scope = inScope?.includes(opt.value) ?? false;
        if (opt.disabled) {
          return (
            <div
              key={String(opt.value)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 opacity-30"
            >
              <span
                className="border-foreground/20 size-3.5 shrink-0 rounded-full border"
                aria-hidden
              />
              <span className="text-muted-foreground flex-1 text-left text-xs">{opt.label}</span>
              <span className="sr-only">, indisponible</span>
              {opt.extra}
            </div>
          );
        }
        return (
          <button
            key={String(opt.value)}
            aria-pressed={active}
            type="button"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            )}
            onClick={() => onToggle(opt.value)}
          >
            <OptionSelectionMark active={active} inScope={scope} />
            <span className={cn('flex-1 text-left text-xs', active && 'font-medium')}>
              {opt.label}
            </span>
            {scope && !active ? <span className="sr-only">, inclus dans la plage</span> : null}
            {opt.extra}
          </button>
        );
      })}
    </div>
  );
}

// ─── Dimension badge ──────────────────────────────────────────────────────────

function DimBadge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }
  return (
    <>
      <span className="sr-only">
        , {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <span
        className="bg-highlight text-highlight-foreground text-data flex size-5 items-center justify-center rounded-full text-xs leading-none font-semibold"
        aria-hidden
      >
        {count}
      </span>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DesktopFilterMenu({
  filters,
  counts,
  onApply,
  onClose,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
  onClose: () => void;
}) {
  // null = no sub-menu open (default, opens on hover)
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const dims: Array<{
    id: Section;
    label: string;
    Icon: React.ElementType;
    badgeCount: number;
    panelId: string;
  }> = [
    {
      id: 'types',
      label: 'Type',
      Icon: Zap,
      badgeCount: countDimensionSelections(filters, 'types'),
      panelId: 'history-filter-panel-types',
    },
    {
      id: 'duration',
      label: 'Durée',
      Icon: Timer,
      badgeCount: countDimensionSelections(filters, 'duration'),
      panelId: 'history-filter-panel-duration',
    },
    {
      id: 'period',
      label: 'Période',
      Icon: Calendar,
      badgeCount: countDimensionSelections(filters, 'period'),
      panelId: 'history-filter-panel-period',
    },
    {
      id: 'distance',
      label: 'Distance',
      Icon: Ruler,
      badgeCount: countDimensionSelections(filters, 'distance'),
      panelId: 'history-filter-panel-distance',
    },
  ];

  return (
    <div
      ref={containerRef}
      aria-label="Filtres d'historique"
      className="absolute top-full left-0 z-50 mt-2 flex items-start gap-1.5"
      id="history-filter-menu"
      role="group"
      onMouseLeave={() => setActiveSection(null)}
    >
      {/* Left panel */}
      <div className="analysis-panel-alt border-foreground/12 rounded-analysis-lg w-44 border p-1">
        {dims.map((dim) => {
          const active = activeSection === dim.id;
          return (
            <button
              key={dim.id}
              aria-controls={active ? dim.panelId : undefined}
              aria-expanded={active}
              aria-haspopup="true"
              type="button"
              className={cn(
                'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                active
                  ? 'bg-foreground/8 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
              onClick={() => setActiveSection(dim.id)}
              onFocus={() => setActiveSection(dim.id)}
              onMouseEnter={() => setActiveSection(dim.id)}
            >
              <dim.Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="flex-1 text-left text-xs font-medium">{dim.label}</span>
              <DimBadge count={dim.badgeCount} />
              <ChevronRight className="size-3 opacity-30" aria-hidden />
            </button>
          );
        })}
      </div>

      {/* Right panel — separate box, appears on hover (Desktop 1 pattern) */}
      {activeSection && (
        <div
          className="analysis-panel-alt border-foreground/12 rounded-analysis-lg w-52 border p-1"
          id={`history-filter-panel-${activeSection}`}
        >
          {activeSection === 'types' && (
            <TypeRows counts={counts} filters={filters} onApply={onApply} />
          )}
          {activeSection === 'duration' && <DurationRows filters={filters} onApply={onApply} />}
          {activeSection === 'period' && <PeriodRows filters={filters} onApply={onApply} />}
          {activeSection === 'distance' && <DistanceRows filters={filters} onApply={onApply} />}
        </div>
      )}
    </div>
  );
}

// ─── Section implementations ──────────────────────────────────────────────────

function TypeRows({
  filters,
  counts,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (f: TrainingHistoryFilters) => void;
}) {
  const options: RowOption[] = TYPE_ORDER.map((type) => ({
    value: type,
    label: activityTypeLabels[type],
    disabled: counts[type] === 0,
    extra: <span className="text-muted-foreground/50 text-data text-xs">{counts[type]}</span>,
  }));

  return (
    <OptionRows
      options={options}
      selected={filters.types}
      onToggle={(value) => {
        const type = value as ActivityType;
        const next = filters.types.includes(type)
          ? filters.types.filter((t) => t !== type)
          : [...filters.types, type];
        onApply({
          ...filters,
          types: next,
          distanceMinKm: null,
          distanceMaxKm: null,
        });
      }}
    />
  );
}

function DurationRows({
  filters,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  onApply: (f: TrainingHistoryFilters) => void;
}) {
  const selected = rangeToPresetSelections(
    filters.durationMinMin,
    filters.durationMaxMin,
    DURATION_PRESETS,
  );
  const inScope = presetsInScope(selected, DURATION_PRESETS);
  const options: RowOption[] = DURATION_PRESETS.map((v) => ({ value: v, label: `${v} min` }));

  return (
    <OptionRows
      inScope={inScope}
      options={options}
      selected={selected}
      onToggle={(value) => {
        const v = value as number;
        const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
        const { min, max } = presetSelectionsToRange(next);
        onApply({ ...filters, durationMinMin: min, durationMaxMin: max });
      }}
    />
  );
}

function PeriodRows({
  filters,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  onApply: (f: TrainingHistoryFilters) => void;
}) {
  const selected = rangeToPresetSelections(
    filters.periodMinDays,
    filters.periodMaxDays,
    PERIOD_PRESETS,
  );
  const inScope = presetsInScope(selected, PERIOD_PRESETS);
  const options: RowOption[] = PERIOD_PRESETS.map((v) => ({
    value: v,
    label: v === 365 ? '12 mois' : `${v} jours`,
  }));

  return (
    <OptionRows
      inScope={inScope}
      options={options}
      selected={selected}
      onToggle={(value) => {
        const v = value as number;
        const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
        const { min, max } = presetSelectionsToRange(next);
        onApply({ ...filters, periodMinDays: min, periodMaxDays: max });
      }}
    />
  );
}

function DistanceRows({
  filters,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  onApply: (f: TrainingHistoryFilters) => void;
}) {
  const selected = rangeToPresetSelections(
    filters.distanceMinKm,
    filters.distanceMaxKm,
    DISTANCE_PRESETS_KM,
  );
  const inScope = presetsInScope(selected, DISTANCE_PRESETS_KM);
  const options: RowOption[] = DISTANCE_PRESETS_KM.map((v) => ({ value: v, label: `${v} km` }));

  return (
    <OptionRows
      inScope={inScope}
      options={options}
      selected={selected}
      onToggle={(value) => {
        const v = value as number;
        const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
        const { min, max } = presetSelectionsToRange(next);
        onApply({ ...filters, distanceMinKm: min, distanceMaxKm: max });
      }}
    />
  );
}
