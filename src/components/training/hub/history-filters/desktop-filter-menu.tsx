'use client';

import { ActivityType } from '@prisma/client';
import { Calendar, Check, ChevronRight, Ruler, Timer, Trophy, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  countDimensionSelections,
  DISTANCE_PRESETS_KM,
  DURATION_PRESETS,
  PERIOD_PRESETS,
  presetsInScope,
  presetSelectionsToRange,
  rangeToPresetSelections,
  TRIATHLON_FORMAT_LABELS,
  TRIATHLON_FORMATS,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { activityTypeLabels } from '@/lib/format';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
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
  if (active) return <Check className="text-foreground size-3.5 shrink-0" />;
  if (inScope) {
    return (
      <span className="border-foreground/40 bg-foreground/10 size-3.5 shrink-0 rounded-full border" />
    );
  }
  return <span className="border-foreground/20 size-3.5 shrink-0 rounded-full border" />;
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
              <span className="border-foreground/20 size-3.5 shrink-0 rounded-full border" />
              <span className="text-muted-foreground flex-1 text-left text-xs">{opt.label}</span>
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
            {opt.extra}
          </button>
        );
      })}
    </div>
  );
}

// ─── Dimension badge ──────────────────────────────────────────────────────────

function DimBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-highlight text-highlight-foreground flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-semibold">
      {count}
    </span>
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

  const isTriathlonOnly = filters.types.length === 1 && filters.types[0] === ActivityType.TRIATHLON;

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  const dims: Array<{
    id: Section;
    label: string;
    Icon: React.ElementType;
    badgeCount: number;
  }> = [
    {
      id: 'types',
      label: 'Type',
      Icon: Zap,
      badgeCount: countDimensionSelections(filters, 'types'),
    },
    {
      id: 'duration',
      label: isTriathlonOnly ? 'Format' : 'Durée',
      Icon: isTriathlonOnly ? Trophy : Timer,
      badgeCount: isTriathlonOnly
        ? countDimensionSelections(filters, 'format')
        : countDimensionSelections(filters, 'duration'),
    },
    {
      id: 'period',
      label: 'Période',
      Icon: Calendar,
      badgeCount: countDimensionSelections(filters, 'period'),
    },
    {
      id: 'distance',
      label: 'Distance',
      Icon: Ruler,
      badgeCount: countDimensionSelections(filters, 'distance'),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 z-50 mt-2 flex items-start gap-1.5"
      onMouseLeave={() => setActiveSection(null)}
    >
      {/* Left panel */}
      <div className="analysis-panel-alt border-foreground/12 w-44 rounded-xl border p-1">
        {dims.map((dim) => {
          const active = activeSection === dim.id;
          return (
            <button
              key={dim.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                active
                  ? 'bg-foreground/8 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
              onMouseEnter={() => setActiveSection(dim.id)}
            >
              <dim.Icon className="size-3.5 shrink-0" />
              <span className="flex-1 text-left text-xs font-medium">{dim.label}</span>
              <DimBadge count={dim.badgeCount} />
              <ChevronRight className="size-3 opacity-30" />
            </button>
          );
        })}
      </div>

      {/* Right panel — separate box, appears on hover (Desktop 1 pattern) */}
      {activeSection && (
        <div className="analysis-panel-alt border-foreground/12 w-52 rounded-xl border p-1">
          {activeSection === 'types' && (
            <TypeRows counts={counts} filters={filters} onApply={onApply} />
          )}
          {activeSection === 'duration' && !isTriathlonOnly && (
            <DurationRows filters={filters} onApply={onApply} />
          )}
          {activeSection === 'duration' && isTriathlonOnly && (
            <FormatRows filters={filters} onApply={onApply} />
          )}
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
    extra: (
      <span className="text-muted-foreground/50 text-[11px] tabular-nums">{counts[type]}</span>
    ),
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
          triathlonFormats: [],
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

function FormatRows({
  filters,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  onApply: (f: TrainingHistoryFilters) => void;
}) {
  const options: RowOption[] = TRIATHLON_FORMATS.map((fmt) => ({
    value: fmt,
    label: TRIATHLON_FORMAT_LABELS[fmt],
  }));

  return (
    <OptionRows
      options={options}
      selected={filters.triathlonFormats}
      onToggle={(value) => {
        const fmt = value as (typeof TRIATHLON_FORMATS)[number];
        const next = filters.triathlonFormats.includes(fmt)
          ? filters.triathlonFormats.filter((f) => f !== fmt)
          : [...filters.triathlonFormats, fmt];
        onApply({ ...filters, triathlonFormats: next });
      }}
    />
  );
}
