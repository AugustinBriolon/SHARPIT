'use client';

import { EndurancePrescriptionEditor } from '@/components/planning/session/edit/endurance-prescription-editor';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';

export function PlannedSessionEnduranceFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { session, enduranceBlocks, setEnduranceBlocks, enduranceSport } = dialog;

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
