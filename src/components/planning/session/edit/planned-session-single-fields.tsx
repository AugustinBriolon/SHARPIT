'use client';

import { SessionAccessoriesPicker } from '@/components/planning/session/accessories/session-accessories-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlannedSessionIntensityGoalFields } from '@/components/planning/session/edit/planned-session-intensity-goal-fields';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { PlannedSessionOutdoorContextFields } from '@/components/planning/session/edit/planned-session-outdoor-context-fields';
import { PlannedSessionPrescriptionFields } from '@/components/planning/session/edit/planned-session-prescription-fields';

export function PlannedSessionSingleFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { showOutdoorContext, session, type, accessories, setAccessories } = dialog;

  return (
    <>
      <PlannedSessionIntensityGoalFields dialog={dialog} />

      {showOutdoorContext ? <PlannedSessionOutdoorContextFields dialog={dialog} /> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="durationMin">Durée (min)</Label>
          <Input
            defaultValue={session?.durationMin ?? ''}
            id="durationMin"
            min={0}
            name="durationMin"
            placeholder="90"
            type="number"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="load">Charge prévue (TSS)</Label>
          <Input
            defaultValue={session?.load ?? ''}
            id="load"
            min={0}
            name="load"
            placeholder="auto si vide"
            step="any"
            type="number"
          />
        </div>
      </div>

      <PlannedSessionPrescriptionFields dialog={dialog} />

      <SessionAccessoriesPicker selected={accessories} type={type} onChange={setAccessories} />
    </>
  );
}
