'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { intensityLabels, intensityOrder } from '@/lib/planned-session/sessions';
import type { SessionIntensity } from '@prisma/client';
import { NO_GOAL } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';

export function PlannedSessionIntensityGoalFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { intensity, setIntensity, goalId, setGoalId, linkableGoals } = dialog;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label>Intensité</Label>
        <Select value={intensity} onValueChange={(v) => setIntensity(v as SessionIntensity)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{intensityLabels[intensity]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {intensityOrder.map((i) => (
              <SelectItem key={i} value={i}>
                {intensityLabels[i]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2">
        <Label>Objectif lié</Label>
        <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>
              {goalId === NO_GOAL
                ? 'Aucun'
                : (linkableGoals.find((g) => g.id === goalId)?.title ?? 'Aucun')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GOAL}>Aucun</SelectItem>
            {linkableGoals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
