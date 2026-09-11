'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ActivityType } from '@prisma/client';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { EndurancePrescriptionEditor } from '@/components/planning/session/edit/endurance-prescription-editor';
import { StrengthPrescriptionEditor } from '@/components/planning/session/edit/strength-prescription-editor';
import { extractStrengthSessionIntent } from '@/lib/planned-session/strength/strength-prescription';

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

export function PlannedSessionEnduranceFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { session, enduranceBlocks, setEnduranceBlocks, enduranceSport } = dialog;

  if (!enduranceSport) {
    return null;
  }

  return (
    <>
      <EndurancePrescriptionEditor
        blocks={enduranceBlocks}
        sport={enduranceSport}
        onChange={setEnduranceBlocks}
      />
      {enduranceBlocks.length === 0 ? (
        <div className="space-y-2">
          <Label htmlFor="description">
            Ou déroulé en texte
            <span className="text-destructive"> *</span>
          </Label>
          <Textarea
            defaultValue={session?.description ?? ''}
            id="description"
            name="description"
            placeholder="Sans étapes ci-dessus, décris la séance ici"
            rows={3}
            required
          />
        </div>
      ) : (
        <input name="description" type="hidden" value="" />
      )}
    </>
  );
}

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
