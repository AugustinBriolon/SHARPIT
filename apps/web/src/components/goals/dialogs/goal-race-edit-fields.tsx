'use client';

import { GoalPriority } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { priorityDescriptions, priorityLabels, priorityOrder } from '@/lib/goals/goals';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import {
  GoalRaceDateLocationFields,
  GoalRaceDetailFields,
} from '@/components/goals/dialogs/goal-race-field-groups';

const NO_PRIORITY = 'none';

function getPriorityLabel(priority: string): string {
  if (priority === NO_PRIORITY) {
    return 'Non définie';
  }
  const p = priority as GoalPriority;
  return `${priorityLabels[p]} — ${priorityDescriptions[p]}`;
}

export function GoalRaceEditFields({
  goal,
  priority,
  onPriorityChange,
}: {
  goal?: GoalForEdit | null;
  priority: string;
  onPriorityChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Nom de la course</Label>
        <Input
          defaultValue={goal?.title ?? ''}
          id="title"
          name="title"
          placeholder="Half Ironman de Versailles"
          required
        />
      </div>

      <GoalRaceDateLocationFields goal={goal} />

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

      <GoalRaceDetailFields goal={goal} />
    </>
  );
}
