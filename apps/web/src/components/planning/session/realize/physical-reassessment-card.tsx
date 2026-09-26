'use client';

import { startOfDay } from 'date-fns';
import { usePhysicalNotes } from '@/hooks/use-physical';
import type { ClientPhysicalNote } from '@sharpit/server/lib/query/types';
import type { SessionAnalysis } from '@sharpit/server/lib/validators/coach';
import { PhysicalReassessmentEditor } from '@/components/planning/session/realize/physical-reassessment-editor';

export type PhysicalReassessment = NonNullable<SessionAnalysis['physicalReassessments']>[number];

export function PhysicalReassessmentCard({
  item,
  hideTitle,
  onResolved,
}: {
  item: PhysicalReassessment;
  hideTitle?: boolean;
  onResolved?: (
    result: { kind: 'saved'; noteTitle: string; severity: number } | { kind: 'dismissed' },
  ) => void;
}) {
  const notesQuery = usePhysicalNotes();
  const note = notesQuery.data?.find((n) => n.id === item.noteId);

  if (!note || (note.category !== 'PAIN' && note.category !== 'INJURY')) {
    return null;
  }

  return (
    <PhysicalReassessmentEditor
      hideTitle={hideTitle}
      item={item}
      note={note}
      onResolved={onResolved}
    />
  );
}

export function isReassessmentAnswered(
  note: ClientPhysicalNote,
  analyzedAt: Date | null,
  sessionDate: Date,
): boolean {
  if (note.checkins.length === 0) {
    return false;
  }
  const since = analyzedAt ?? startOfDay(sessionDate);
  return note.checkins.some((c) => new Date(c.createdAt) >= since);
}

export { PhysicalReassessmentQueue } from '@/components/planning/session/realize/physical-reassessment-queue';
