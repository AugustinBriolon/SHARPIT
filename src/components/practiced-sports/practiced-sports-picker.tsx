'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  COMPLEMENTARY_PRACTICED_SPORTS,
  CORE_PRACTICED_SPORTS,
  PRACTICED_SPORT_LABELS,
  type PracticedSportId,
  togglePracticedSport,
} from '@/lib/practiced-sports';

function SportCheckboxRow({
  id,
  checked,
  onToggle,
}: {
  id: PracticedSportId;
  checked: boolean;
  onToggle: (id: PracticedSportId, enabled: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 text-sm lg:min-h-9">
      <Checkbox checked={checked} onCheckedChange={(value) => onToggle(id, value === true)} />
      <span>{PRACTICED_SPORT_LABELS[id]}</span>
    </label>
  );
}

function SportFieldset({
  legendId,
  title,
  hint,
  ids,
  sports,
  onToggle,
}: {
  legendId: string;
  title: string;
  hint: string;
  ids: readonly PracticedSportId[];
  sports: readonly PracticedSportId[];
  onToggle: (id: PracticedSportId, enabled: boolean) => void;
}) {
  return (
    <fieldset aria-labelledby={legendId} className="space-y-2">
      <legend className="text-sm font-medium" id={legendId}>
        {title}
      </legend>
      <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
      <div className="grid gap-2">
        {ids.map((id) => (
          <SportCheckboxRow key={id} checked={sports.includes(id)} id={id} onToggle={onToggle} />
        ))}
      </div>
    </fieldset>
  );
}

export function PracticedSportsPicker({
  sports,
  onSportsChange,
  idPrefix = 'practiced',
}: {
  sports: readonly PracticedSportId[];
  onSportsChange: (next: PracticedSportId[]) => void;
  idPrefix?: string;
}) {
  function handleToggle(id: PracticedSportId, enabled: boolean) {
    onSportsChange(togglePracticedSport(sports, id, enabled));
  }

  return (
    <div className="space-y-5">
      <SportFieldset
        hint="Choisis au moins un sport cœur — c'est ce que SharpIt coachera en priorité."
        ids={CORE_PRACTICED_SPORTS}
        legendId={`${idPrefix}-core-legend`}
        sports={sports}
        title="Sports d'endurance"
        onToggle={handleToggle}
      />
      <SportFieldset
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
