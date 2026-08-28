import type { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';

export function buildPhysicalNotePayload(options: {
  form: FormData;
  category: PhysicalCategory;
  status: PhysicalStatus;
  side: BodySide;
  severity: number;
  affectsTraining: boolean;
  bodyPart: string;
}) {
  const { form, category, status, side, severity, affectsTraining, bodyPart } = options;
  return {
    category,
    status,
    side,
    severity,
    affectsTraining,
    title: String(form.get('title') || '').trim(),
    bodyPart: bodyPart.trim() || null,
    description: (form.get('description') as string) || null,
    startDate: new Date(`${String(form.get('startDate'))}T12:00:00`),
  };
}

export function physicalNoteSubmitLabel(
  pending: boolean,
  offline: boolean,
  offlineLabel: string,
  isEdit: boolean,
): string {
  if (pending) {
    return 'Enregistrement…';
  }
  if (offline) {
    return offlineLabel;
  }
  return isEdit ? 'Mettre à jour' : 'Créer';
}
