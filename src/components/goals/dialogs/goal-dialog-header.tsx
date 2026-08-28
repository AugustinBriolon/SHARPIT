import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function GoalDialogHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}</DialogTitle>
      <DialogDescription>
        {isEdit
          ? 'Ajuste les détails de cet objectif.'
          : 'Choisis le type d’objectif, puis renseigne les détails.'}
      </DialogDescription>
    </DialogHeader>
  );
}
