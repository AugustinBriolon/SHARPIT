'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { toDateInput } from '@/components/goals/dialogs/goal-dialog-edit-forms';

export function GoalRaceDateLocationFields({ goal }: { goal?: GoalForEdit | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="targetDate">Date</Label>
        <Input
          defaultValue={toDateInput(goal?.targetDate)}
          id="targetDate"
          name="targetDate"
          type="date"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input
          defaultValue={goal?.location ?? ''}
          id="location"
          name="location"
          placeholder="Versailles"
        />
      </div>
    </div>
  );
}

export function GoalRaceDetailFields({ goal }: { goal?: GoalForEdit | null }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="raceFormat">Format / distance</Label>
        <Input
          defaultValue={goal?.raceFormat ?? ''}
          id="raceFormat"
          name="raceFormat"
          placeholder="Half Ironman, 10 km, Marathon…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetPerformance">Objectif visé</Label>
        <Input
          defaultValue={goal?.targetPerformance ?? ''}
          id="targetPerformance"
          name="targetPerformance"
          placeholder="Sub 5h00, Top 10, Terminer…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Stratégie &amp; remarques</Label>
        <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={3} />
      </div>
    </>
  );
}
