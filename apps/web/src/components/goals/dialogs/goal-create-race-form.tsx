'use client';

import { useEffect, useId, useState } from 'react';
import { GoalKind, GoalPriority } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { priorityDescriptions, priorityLabels, priorityOrder } from '@/lib/goals/goals';
import { buildRaceTitle } from '@/lib/goals/race-title';
import type { GoalPayload } from '@/hooks/use-data';

const NO_PRIORITY = 'none';

function getPriorityLabel(priority: string): string {
  if (priority === NO_PRIORITY) {
    return 'Non définie';
  }
  const p = priority as GoalPriority;
  return `${priorityLabels[p]} — ${priorityDescriptions[p]}`;
}

export function isCompactRaceReady(input: {
  targetDate: string;
  raceFormat: string;
  targetPerformance: string;
}): boolean {
  return (
    input.targetDate.trim().length > 0 &&
    input.raceFormat.trim().length > 0 &&
    input.targetPerformance.trim().length > 0
  );
}

function RaceTitleField() {
  return (
    <div className="space-y-2">
      <Label htmlFor="goal-create-title">Nom de la course</Label>
      <Input
        id="goal-create-title"
        name="title"
        placeholder="Half Ironman de Versailles"
        required
      />
    </div>
  );
}

function RaceDateAndLocationFields({
  compact,
  targetDate,
  onTargetDateChange,
}: {
  compact: boolean;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
}) {
  if (compact) {
    return (
      <div className="space-y-2">
        <Label htmlFor="goal-create-date">Date</Label>
        <Input
          id="goal-create-date"
          name="targetDate"
          type="date"
          value={targetDate}
          required
          onChange={(e) => onTargetDateChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="goal-create-date">Date</Label>
        <Input id="goal-create-date" name="targetDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-create-location">Lieu</Label>
        <Input id="goal-create-location" name="location" placeholder="Versailles" />
      </div>
    </div>
  );
}

function RacePriorityField({
  priority,
  onPriorityChange,
}: {
  priority: string;
  onPriorityChange: (priority: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Priorité</Label>
      <Select value={priority} onValueChange={(v) => onPriorityChange(v ?? NO_PRIORITY)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue>{getPriorityLabel(priority)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {priorityOrder.map((p) => (
            <SelectItem key={p} value={p}>
              {priorityLabels[p]} — {priorityDescriptions[p]}
            </SelectItem>
          ))}
          <SelectItem value={NO_PRIORITY}>Non définie</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function RaceTextField({
  id,
  name,
  label,
  placeholder,
  compact,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  compact: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {compact ? (
        <Input
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          required
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input id={id} name={name} placeholder={placeholder} />
      )}
    </div>
  );
}

function RaceCoreFields({
  compact,
  raceFormat,
  targetPerformance,
  onRaceFormatChange,
  onTargetPerformanceChange,
}: {
  compact: boolean;
  raceFormat: string;
  targetPerformance: string;
  onRaceFormatChange: (value: string) => void;
  onTargetPerformanceChange: (value: string) => void;
}) {
  return (
    <>
      <RaceTextField
        compact={compact}
        id="goal-create-format"
        label="Format / distance"
        name="raceFormat"
        placeholder="Half Ironman, 10 km, Marathon…"
        value={raceFormat}
        onChange={onRaceFormatChange}
      />
      <RaceTextField
        compact={compact}
        id="goal-create-perf"
        label="Objectif visé"
        name="targetPerformance"
        placeholder="Sub 5h00, Top 10, Terminer…"
        value={targetPerformance}
        onChange={onTargetPerformanceChange}
      />
    </>
  );
}

function RaceNotesField() {
  return (
    <div className="space-y-2">
      <Label htmlFor="goal-create-notes">Stratégie &amp; remarques</Label>
      <Textarea id="goal-create-notes" name="notes" rows={3} />
    </div>
  );
}

function useCompactRaceReadyEffect(
  compact: boolean,
  onReadyChange: ((ready: boolean) => void) | undefined,
  input: { targetDate: string; raceFormat: string; targetPerformance: string },
) {
  useEffect(() => {
    if (!compact || !onReadyChange) {
      return;
    }
    onReadyChange(isCompactRaceReady(input));
  }, [compact, onReadyChange, input.raceFormat, input.targetDate, input.targetPerformance]);
}

export function GoalCreateRaceForm({
  priority,
  compact = false,
  formId,
  onPriorityChange,
  onReadyChange,
  onSubmit,
}: {
  priority: string;
  /** Onboarding: date + format + target only. Title, lieu, priorité, notes stay on Objectifs. */
  compact?: boolean;
  formId?: string;
  onPriorityChange: (priority: string) => void;
  onReadyChange?: (ready: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const generatedId = useId();
  const id = formId ?? generatedId;
  const [targetDate, setTargetDate] = useState('');
  const [raceFormat, setRaceFormat] = useState('');
  const [targetPerformance, setTargetPerformance] = useState('');

  useCompactRaceReadyEffect(compact, onReadyChange, {
    targetDate,
    raceFormat,
    targetPerformance,
  });

  return (
    <form className="space-y-4" id={id} onSubmit={onSubmit}>
      {compact ? null : <RaceTitleField />}
      <RaceDateAndLocationFields
        compact={compact}
        targetDate={targetDate}
        onTargetDateChange={setTargetDate}
      />
      {compact ? null : (
        <RacePriorityField priority={priority} onPriorityChange={onPriorityChange} />
      )}
      <RaceCoreFields
        compact={compact}
        raceFormat={raceFormat}
        targetPerformance={targetPerformance}
        onRaceFormatChange={setRaceFormat}
        onTargetPerformanceChange={setTargetPerformance}
      />
      {compact ? null : <RaceNotesField />}
    </form>
  );
}

export function buildRaceCreatePayload(fd: FormData, priority: string): GoalPayload {
  const str = (k: string) => {
    const v = fd.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  };

  const raceFormat = str('raceFormat');
  const targetPerformance = str('targetPerformance');
  const typedTitle = (fd.get('title') as string)?.trim() ?? '';

  return {
    title: typedTitle || buildRaceTitle(raceFormat, targetPerformance),
    kind: GoalKind.RACE,
    notes: str('notes'),
    location: str('location'),
    targetDate: str('targetDate'),
    priority: priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']),
    raceFormat,
    targetPerformance,
  };
}
