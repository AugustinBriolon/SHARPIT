'use client';

import { GoalHorizon } from '@prisma/client';
import { Checkbox } from '@/components/ui/checkbox';
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
import { horizonLabels, horizonOrder } from '@/lib/goals/goals';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { toDateInput } from '@/components/goals/dialogs/goal-dialog-edit-forms';

function LegacyMetricValueGrid({ goal }: { goal?: GoalForEdit | null }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label htmlFor="startValue">Départ</Label>
        <Input
          defaultValue={goal?.startValue ?? ''}
          id="startValue"
          name="startValue"
          step="any"
          type="number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currentValue">Actuel</Label>
        <Input
          defaultValue={goal?.currentValue ?? ''}
          id="currentValue"
          name="currentValue"
          step="any"
          type="number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetValue">Cible</Label>
        <Input
          defaultValue={goal?.targetValue ?? ''}
          id="targetValue"
          name="targetValue"
          step="any"
          type="number"
        />
      </div>
    </div>
  );
}

export function GoalLegacyMetricFields({
  goal,
  legacyHorizon,
  legacyLowerIsBetter,
  onHorizonChange,
  onLowerIsBetterChange,
}: {
  goal?: GoalForEdit | null;
  legacyHorizon: GoalHorizon;
  legacyLowerIsBetter: boolean;
  onHorizonChange: (horizon: GoalHorizon) => void;
  onLowerIsBetterChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input defaultValue={goal?.title ?? ''} id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <Label>Horizon</Label>
        <Select value={legacyHorizon} onValueChange={(v) => v && onHorizonChange(v as GoalHorizon)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{horizonLabels[legacyHorizon]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {horizonOrder.map((h) => (
              <SelectItem key={h} value={h}>
                {horizonLabels[h]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <LegacyMetricValueGrid goal={goal} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="unit">Unité</Label>
          <Input defaultValue={goal?.unit ?? ''} id="unit" name="unit" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetDate">Échéance</Label>
          <Input
            defaultValue={toDateInput(goal?.targetDate)}
            id="targetDate"
            name="targetDate"
            type="date"
          />
        </div>
      </div>

      <label className="text-foreground flex items-center gap-2.5 text-sm">
        <Checkbox
          checked={legacyLowerIsBetter}
          onCheckedChange={(checked) => onLowerIsBetterChange(checked === true)}
        />
        Plus bas = meilleur
      </label>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
      </div>
    </>
  );
}
