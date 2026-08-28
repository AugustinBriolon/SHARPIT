'use client';

import { StrengthPrescriptionEditor } from '@/components/planning/session/edit/strength-prescription-editor';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractStrengthSessionIntent } from '@/lib/planned-session/strength/strength-prescription';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';

export function PlannedSessionStrengthFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { session, strengthRows, setStrengthRows } = dialog;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="description">Intention</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Focus chaîne postérieure, charge légère…"
          rows={2}
          defaultValue={
            session?.description ? (extractStrengthSessionIntent(session.description) ?? '') : ''
          }
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Optionnel — le déroulé, c’est la liste d’exercices ci-dessous.
        </p>
      </div>
      <StrengthPrescriptionEditor rows={strengthRows} required onChange={setStrengthRows} />
    </>
  );
}
