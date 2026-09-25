'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { PhysicalNoteFormFields } from '@/components/physical-health/dialogs/physical-note-form-fields';
import { PhysicalNoteDialogFooter } from '@/components/physical-health/dialogs/physical-note-dialog-footer';
import {
  usePhysicalNoteDialogHandlers,
  usePhysicalNoteDialogState,
} from '@/components/physical-health/dialogs/use-physical-note-dialog';

interface Props {
  note?: ClientPhysicalNote | null;
  onClose: () => void;
}

export function PhysicalNoteDialog({ note, onClose }: Props) {
  const state = usePhysicalNoteDialogState(note);
  const { handleSubmit, handleDelete } = usePhysicalNoteDialogHandlers(state, onClose, note);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {state.isEdit ? 'Modifier la note' : 'Nouvelle note physique'}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <PhysicalNoteFormFields
              affectsTraining={state.affectsTraining}
              bodyPart={state.bodyPart}
              bodyPartOptions={state.bodyPartOptions}
              category={state.category}
              initialDate={state.initialDate}
              note={note}
              severity={state.severity}
              side={state.side}
              status={state.status}
              onAffectsTrainingChange={state.setAffectsTraining}
              onBodyPartChange={state.setBodyPart}
              onCategoryChange={state.setCategory}
              onSeverityChange={state.setSeverity}
              onSideChange={state.setSide}
              onStatusChange={state.setStatus}
            />

            {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

            <PhysicalNoteDialogFooter
              guardDisabled={state.guardDisabled}
              isEdit={state.isEdit}
              offline={state.offline}
              offlineLabel={state.offlineLabel}
              pending={state.pending}
              onClose={onClose}
              onDelete={handleDelete}
            />
          </form>
        </DialogContent>
      </Dialog>
      {state.dialog}
    </>
  );
}
