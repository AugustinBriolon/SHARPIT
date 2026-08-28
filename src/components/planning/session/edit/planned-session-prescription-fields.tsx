'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ActivityType } from '@prisma/client';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { PlannedSessionStrengthFields } from '@/components/planning/session/edit/planned-session-strength-fields';
import { PlannedSessionEnduranceFields } from '@/components/planning/session/edit/planned-session-endurance-fields';

export function PlannedSessionPrescriptionFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { session, type, enduranceSport } = dialog;

  if (type === ActivityType.STRENGTH) {
    return <PlannedSessionStrengthFields dialog={dialog} />;
  }

  if (!enduranceSport) {
    return (
      <div className="space-y-2">
        <Label htmlFor="description">
          Déroulé
          <span className="text-destructive"> *</span>
        </Label>
        <Textarea
          defaultValue={session?.description ?? ''}
          id="description"
          name="description"
          placeholder="3×10' au seuil, récup 3'… — détaille le déroulé"
          rows={3}
          required
        />
      </div>
    );
  }

  return <PlannedSessionEnduranceFields dialog={dialog} />;
}
