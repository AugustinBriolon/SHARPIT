'use client';

import { useState } from 'react';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import { useActivityFeelingEditor } from '@/components/training/activity/detail/use-activity-feeling-editor';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useActivityMutations } from '@/hooks/use-data';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { NotebookPen } from 'lucide-react';

function FeelingHero({
  feeling,
  rpe,
  onEdit,
}: {
  feeling: string | null;
  rpe: number | null;
  onEdit: () => void;
}) {
  const hasFeeling = Boolean(feeling?.trim());

  return (
    <button
      type="button"
      className={cn(
        'pressable rounded-analysis w-full text-left transition-colors',
        hasFeeling ? 'space-y-1' : 'border-analysis-border/60 border border-dashed px-3 py-3',
      )}
      onClick={onEdit}
    >
      <p className="text-label">Ressenti</p>
      {hasFeeling ? (
        <>
          <p className="text-foreground text-lg leading-snug font-semibold tracking-tight">
            {feeling}
          </p>
          {rpe !== null ? (
            <p className="text-data text-muted-foreground text-sm tabular-nums">RPE {rpe}/10</p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">Ajouter ressenti et RPE</p>
      )}
    </button>
  );
}

function NoteEditor({ activityId, notes }: { activityId: string; notes: string | null }) {
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

  if (editing) {
    return (
      <div className="space-y-2">
        <label className="text-label" htmlFor={`session-note-${activityId}`}>
          Ta note
        </label>
        <textarea
          className="border-analysis-border bg-background text-foreground focus-visible:ring-ring rounded-analysis min-h-24 w-full border px-3 py-2 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
          id={`session-note-${activityId}`}
          maxLength={2000}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={update.isPending} size="sm" type="button" onClick={save}>
            Enregistrer
          </Button>
          <Button
            disabled={update.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  if (notes?.trim()) {
    return (
      <button
        className="pressable border-analysis-border/50 bg-analysis-surface-alt/40 rounded-analysis w-full space-y-1 border px-3 py-3 text-left"
        type="button"
        onClick={startEdit}
      >
        <p className="text-label">Ta note</p>
        <p className="text-verdict text-foreground text-base leading-snug wrap-break-word whitespace-pre-wrap">
          {notes}
        </p>
      </button>
    );
  }

  return (
    <button
      className="pressable border-analysis-border/60 rounded-analysis inline-flex min-h-11 w-full items-center gap-2 border border-dashed px-3 py-3 text-left text-sm"
      type="button"
      onClick={startEdit}
    >
      <NotebookPen className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="text-foreground font-medium">Ajouter une note</span>
    </button>
  );
}

/**
 * SESSION_COMPLETED hero: athlete capture before coach reading.
 */
export function CompletedSessionAthleteCapture({ activity }: { activity: ClientActivity }) {
  const feeling = activity.feeling?.trim() || '';
  const editor = useActivityFeelingEditor({
    activityId: activity.id,
    feeling,
    rpe: activity.rpe ?? null,
  });

  return (
    <section aria-label="Ton ressenti" className="space-y-3">
      <FeelingHero
        feeling={feeling || null}
        rpe={activity.rpe ?? null}
        onEdit={editor.openDialog}
      />
      <NoteEditor activityId={activity.id} notes={activity.notes ?? null} />
      <ActivityFeelingDialog
        activityId={activity.id}
        feeling={editor.editFeeling}
        feelingError={editor.feelingError}
        isPending={editor.isPending}
        open={editor.open}
        rpe={editor.editRpe}
        onFeelingChange={editor.setEditFeeling}
        onOpenChange={editor.setOpen}
        onRpeChange={editor.setEditRpe}
        onSave={editor.handleSave}
      />
    </section>
  );
}
