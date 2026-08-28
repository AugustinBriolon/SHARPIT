'use client';

import { GoalKind } from '@prisma/client';
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
import type { GoalPayload } from '@/hooks/use-data';
import { GoalPriority } from '@prisma/client';

const NO_PRIORITY = 'none';

function getPriorityLabel(priority: string): string {
  if (priority === NO_PRIORITY) {
    return 'Non définie';
  }
  const p = priority as GoalPriority;
  return `${priorityLabels[p]} — ${priorityDescriptions[p]}`;
}

export function GoalCreateRaceForm({
  priority,
  onPriorityChange,
  onSubmit,
}: {
  priority: string;
  onPriorityChange: (priority: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="goal-create-title">Nom de la course</Label>
        <Input
          id="goal-create-title"
          name="title"
          placeholder="Half Ironman de Versailles"
          required
        />
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="goal-create-format">Format / distance</Label>
        <Input
          id="goal-create-format"
          name="raceFormat"
          placeholder="Half Ironman, 10 km, Marathon…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-create-perf">Objectif visé</Label>
        <Input
          id="goal-create-perf"
          name="targetPerformance"
          placeholder="Sub 5h00, Top 10, Terminer…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-create-notes">Stratégie &amp; remarques</Label>
        <Textarea id="goal-create-notes" name="notes" rows={3} />
      </div>
    </form>
  );
}

export function buildRaceCreatePayload(fd: FormData, priority: string): GoalPayload {
  const str = (k: string) => {
    const v = fd.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  };

  return {
    title: (fd.get('title') as string)?.trim() ?? '',
    kind: GoalKind.RACE,
    notes: str('notes'),
    location: str('location'),
    targetDate: str('targetDate'),
    priority: priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']),
    raceFormat: str('raceFormat'),
    targetPerformance: str('targetPerformance'),
  };
}
