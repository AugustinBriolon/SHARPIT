'use client';

import {
  COMPLEMENTARY_PRACTICED_SPORTS,
  CORE_PRACTICED_SPORTS,
  PRACTICED_SPORT_LABELS,
  type PracticedSportId,
  togglePracticedSport,
} from '@/lib/practiced-sports';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  Check,
  Dumbbell,
  Footprints,
  Medal,
  PersonStanding,
  StretchHorizontal,
  Waves,
} from 'lucide-react';

const PRACTICED_SPORT_ICONS: Record<PracticedSportId, LucideIcon> = {
  run: Footprints,
  bike: Bike,
  swim: Waves,
  triathlon: Medal,
  strength: Dumbbell,
  mobility: StretchHorizontal,
  stretching: PersonStanding,
};

function SportSelectCard({
  id,
  selected,
  onToggle,
}: {
  id: PracticedSportId;
  selected: boolean;
  onToggle: (id: PracticedSportId, enabled: boolean) => void;
}) {
  const Icon = PRACTICED_SPORT_ICONS[id];
  const label = PRACTICED_SPORT_LABELS[id];

  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      type="button"
      className={cn(
        'analysis-panel rounded-analysis-lg pressable-lg focus-visible:ring-primary/35 relative flex min-h-0 flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center focus-visible:ring-2 focus-visible:outline-hidden',
        selected
          ? 'border-highlight bg-highlight/30 text-foreground'
          : 'text-muted-foreground hover:bg-analysis-surface-alt/80 hover:text-foreground',
      )}
      onClick={() => onToggle(id, !selected)}
    >
      {selected ? (
        <span
          className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full"
          aria-hidden
        >
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      ) : null}
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-xl',
          selected ? 'icon-well' : 'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="text-xs leading-tight font-medium">{label}</span>
    </button>
  );
}

function SportCardFieldset({
  legendId,
  title,
  hint,
  ids,
  sports,
  onToggle,
  compact,
  columns = 2,
}: {
  legendId: string;
  title: string;
  hint: string;
  ids: readonly PracticedSportId[];
  sports: readonly PracticedSportId[];
  onToggle: (id: PracticedSportId, enabled: boolean) => void;
  compact?: boolean;
  /** Match the column count to the group size so no cell is left empty. */
  columns?: 2 | 3;
}) {
  return (
    <fieldset aria-labelledby={legendId} className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
      <legend className="text-sm font-medium" id={legendId}>
        {title}
      </legend>
      <p className="text-muted-foreground text-xs leading-snug">{hint}</p>
      <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {ids.map((id) => (
          <SportSelectCard key={id} id={id} selected={sports.includes(id)} onToggle={onToggle} />
        ))}
      </div>
    </fieldset>
  );
}

export function PracticedSportsPicker({
  sports,
  onSportsChange,
  idPrefix = 'practiced',
  compact = false,
}: {
  sports: readonly PracticedSportId[];
  onSportsChange: (next: PracticedSportId[]) => void;
  idPrefix?: string;
  /** Tighter vertical rhythm for settings / constrained shells. */
  compact?: boolean;
}) {
  function handleToggle(id: PracticedSportId, enabled: boolean) {
    onSportsChange(togglePracticedSport(sports, id, enabled));
  }

  return (
    <div className={cn(compact ? 'space-y-3' : 'space-y-4')}>
      <SportCardFieldset
        compact={compact}
        hint="Choisis au moins un sport cœur — c'est ce que SharpIt coachera en priorité."
        ids={CORE_PRACTICED_SPORTS}
        legendId={`${idPrefix}-core-legend`}
        sports={sports}
        title="Sports d'endurance"
        onToggle={handleToggle}
      />
      <SportCardFieldset
        columns={3}
        compact={compact}
        hint="Muscu, mobilité, étirements — utiles en soutien, jamais obligatoires."
        ids={COMPLEMENTARY_PRACTICED_SPORTS}
        legendId={`${idPrefix}-comp-legend`}
        sports={sports}
        title="Complémentaire si tu veux"
        onToggle={handleToggle}
      />
    </div>
  );
}
