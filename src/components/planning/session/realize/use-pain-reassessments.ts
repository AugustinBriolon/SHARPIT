'use client';

import { useMemo } from 'react';
import type { ClientPlannedSession } from '@/lib/query/types';
import { usePhysicalNotes } from '@/hooks/use-physical';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { isReassessmentAnswered } from '@/components/planning/session/realize/physical-reassessment-card';

export function usePainReassessments({
  session,
  analysis,
}: {
  session: ClientPlannedSession;
  analysis: SessionAnalysis | null;
}) {
  const notesQuery = usePhysicalNotes();

  return useMemo(() => {
    const notes = notesQuery.data ?? [];
    const sessionAnalyzedAt = session.analyzedAt ? new Date(session.analyzedAt) : null;
    const sessionDate = new Date(session.date);
    return (analysis?.physicalReassessments ?? []).filter((item) => {
      const note = notes.find((n) => n.id === item.noteId);
      if (!note || (note.category !== 'PAIN' && note.category !== 'INJURY')) {
        return false;
      }
      return !isReassessmentAnswered(note, sessionAnalyzedAt, sessionDate);
    });
  }, [analysis?.physicalReassessments, notesQuery.data, session.analyzedAt, session.date]);
}
