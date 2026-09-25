'use client';

import { useMemo } from 'react';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { usePhysicalNotes } from '@/hooks/use-physical';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { isReassessmentAnswered } from '@/components/planning/session/realize/physical-reassessment-card';
import {
  dueReassessments,
  reassessmentQuestion,
  type ReassessmentDue,
} from '@/lib/physical-health/reassessment-due';

type Reassessment = NonNullable<SessionAnalysis['physicalReassessments']>[number];

/** The coach's own wording wins when it produced one; ours is the fallback. */
function toReassessment(due: ReassessmentDue): Reassessment {
  return {
    noteId: due.noteId,
    noteTitle: due.noteTitle,
    question: reassessmentQuestion(due),
    suggestedSeverity: due.suggestedSeverity ?? null,
  } as Reassessment;
}

function isFollowable(note: ClientPhysicalNote | undefined): note is ClientPhysicalNote {
  return Boolean(note && (note.category === 'PAIN' || note.category === 'INJURY'));
}

/**
 * Which conditions to ask about after this session.
 *
 * The list used to be whatever the coach model put in the session analysis, so
 * an athlete with no analysis — no credits, no linked activity, a model that
 * did not think of it — was never asked anything. The deterministic rule now
 * owns the loop and the model only refines the wording.
 */
export function usePainReassessments({
  session,
  analysis,
}: {
  session: { id: string; date: Date | string; analyzedAt: Date | string | null };
  analysis: SessionAnalysis | null;
}) {
  const notesQuery = usePhysicalNotes();

  return useMemo(() => {
    const notes = notesQuery.data ?? [];
    const sessionAnalyzedAt = session.analyzedAt ? new Date(session.analyzedAt) : null;
    const sessionDate = new Date(session.date);

    const fromCoach = (analysis?.physicalReassessments ?? []).filter((item) =>
      isFollowable(notes.find((n) => n.id === item.noteId)),
    );

    const fromRule = dueReassessments({
      notes,
      lastRealisedSessionAt: sessionDate,
      now: new Date(),
    }).map(toReassessment);

    const byNoteId = new Map<string, Reassessment>();
    for (const item of [...fromRule, ...fromCoach]) {
      byNoteId.set(item.noteId, item);
    }

    return [...byNoteId.values()].filter((item) => {
      const note = notes.find((n) => n.id === item.noteId);
      return note ? !isReassessmentAnswered(note, sessionAnalyzedAt, sessionDate) : false;
    });
  }, [analysis?.physicalReassessments, notesQuery.data, session.analyzedAt, session.date]);
}
