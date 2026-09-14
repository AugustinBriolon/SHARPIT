'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useActivityMutations } from '@/hooks/use-data';
import { NotebookPen } from 'lucide-react';

function NoteEditorForm({
  activityId,
  draft,
  isPending,
  onCancel,
  onChange,
  onSave,
}: {
  activityId: string;
  draft: string;
  isPending: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-label" htmlFor={`session-note-${activityId}`}>
        Note complémentaire
      </label>
      <textarea
        className="border-analysis-border bg-background text-foreground focus-visible:ring-ring rounded-analysis min-h-20 w-full border px-3 py-2 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
        id={`session-note-${activityId}`}
        maxLength={2000}
        value={draft}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} size="sm" type="button" onClick={onSave}>
          Enregistrer
        </Button>
        <Button disabled={isPending} size="sm" type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function NoteDisplay({ notes, onEdit }: { notes: string; onEdit: () => void }) {
  return (
    <button
      className="pressable text-muted-foreground hover:text-foreground w-full space-y-0.5 py-1 text-left text-xs"
      type="button"
      onClick={onEdit}
    >
      <p className="text-label">Note complémentaire</p>
      <p className="line-clamp-2 leading-snug wrap-break-word whitespace-pre-wrap">{notes}</p>
    </button>
  );
}

function NoteEmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      className="text-muted-foreground hover:text-foreground pressable inline-flex min-h-9 items-center gap-1.5 text-xs"
      type="button"
      onClick={onEdit}
    >
      <NotebookPen className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span>Ajouter une note complémentaire</span>
    </button>
  );
}

function useNoteEditorState(activityId: string, notes: string | null) {
  const { update } = useActivityMutations();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? '');

  function startEdit() {
    setDraft(notes ?? '');
    setEditing(true);
  }

  function save() {
    const next = draft.trim();
    setEditing(false);
    update.mutate(
      { id: activityId, data: { notes: next.length > 0 ? next : null } },
      {
        onSuccess: () => {
          toast.success(next.length > 0 ? 'Note enregistrée' : 'Note effacée');
        },
      },
    );
  }

  return { draft, editing, isPending: update.isPending, save, setDraft, setEditing, startEdit };
}

/**
 * Athlete contribution only — secondary to the coach Lecture.
 */
export function CompletedSessionAthleteNote({
  activityId,
  notes,
}: {
  activityId: string;
  notes: string | null;
}) {
  const editor = useNoteEditorState(activityId, notes);

  if (editor.editing) {
    return (
      <NoteEditorForm
        activityId={activityId}
        draft={editor.draft}
        isPending={editor.isPending}
        onCancel={() => editor.setEditing(false)}
        onChange={editor.setDraft}
        onSave={editor.save}
      />
    );
  }

  if (notes?.trim()) {
    return <NoteDisplay notes={notes} onEdit={editor.startEdit} />;
  }

  return <NoteEmptyState onEdit={editor.startEdit} />;
}

/** @deprecated Use CompletedSessionAthleteNote. */
export function CompletedSessionAthleteCapture({
  activity,
}: {
  activity: { id: string; notes?: string | null };
  analysis?: unknown;
  isAnalyzing?: boolean;
}) {
  return <CompletedSessionAthleteNote activityId={activity.id} notes={activity.notes ?? null} />;
}
