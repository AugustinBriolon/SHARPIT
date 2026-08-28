'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { severityColor } from '@/lib/physical';
import { cn } from '@/lib/utils';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { usePhysicalNoteMutations, usePhysicalNotes } from '@/hooks/use-physical';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { Check, Loader2, X } from 'lucide-react';
import { startOfDay } from 'date-fns';
import { useState } from 'react';

export type PhysicalReassessment = NonNullable<SessionAnalysis['physicalReassessments']>[number];

function ReassessmentDoneBanner({ noteTitle, severity }: { noteTitle: string; severity: number }) {
  return (
    <div className="border-primary/30 bg-primary/8 text-primary flex items-center gap-1.5 rounded-md border p-2 text-xs">
      <Check className="size-3.5 shrink-0" />
      <span>
        Suivi mis à jour : {noteTitle} ({severity}/10)
      </span>
    </div>
  );
}

function PhysicalReassessmentForm({
  item,
  contextHint,
  severity,
  comment,
  guardDisabled,
  isSaving,
  offline,
  offlineLabel,
  onDismiss,
  onSeverityChange,
  onCommentChange,
  onSave,
}: {
  item: PhysicalReassessment;
  contextHint: string | null;
  severity: number;
  comment: string;
  guardDisabled: boolean;
  isSaving: boolean;
  offline: boolean;
  offlineLabel: string;
  onDismiss: () => void;
  onSeverityChange: (value: number) => void;
  onCommentChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/80 space-y-2 rounded-md border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-card-title text-sm">{item.noteTitle}</p>
        <button
          aria-label="Ignorer"
          className="text-muted-foreground hover:text-foreground"
          type="button"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-muted-foreground text-xs">{item.question}</p>
      {contextHint ? (
        <p className="text-muted-foreground/80 border-border/40 bg-muted/30 text-label rounded-md border px-2 py-1.5 leading-relaxed normal-case">
          Contexte séance : {contextHint}
        </p>
      ) : null}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sévérité ressentie</span>
          <span className={cn('text-data font-semibold', severityColor(severity))}>
            {severity}/10
          </span>
        </div>
        <input
          aria-label="Sévérité ressentie"
          aria-valuetext={`${severity} sur 10`}
          className="accent-primary w-full"
          max={10}
          min={0}
          step={1}
          type="range"
          value={severity}
          onChange={(e) => onSeverityChange(Number(e.target.value))}
        />
      </div>
      <Textarea
        className="min-h-0 text-xs"
        placeholder="Ressenti pendant la séance…"
        rows={2}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
      />
      <Button disabled={guardDisabled || isSaving} size="sm" type="button" onClick={onSave}>
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {offline ? offlineLabel : 'Enregistrer le point'}
      </Button>
    </div>
  );
}

function PhysicalReassessmentEditor({
  item,
  note,
}: {
  item: PhysicalReassessment;
  note: ClientPhysicalNote;
}) {
  const { addCheckin } = usePhysicalNoteMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [severity, setSeverity] = useState<number>(item.suggestedSeverity ?? note.severity ?? 5);
  const [comment, setComment] = useState('');
  const contextHint = item.comment?.trim() || null;

  if (dismissed) {
    return null;
  }

  if (done) {
    return <ReassessmentDoneBanner noteTitle={item.noteTitle} severity={severity} />;
  }

  function handleSave() {
    if (guardDisabled) {
      return;
    }
    addCheckin.mutate(
      {
        id: item.noteId,
        data: { severity, comment: comment.trim() || null },
      },
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <PhysicalReassessmentForm
      comment={comment}
      contextHint={contextHint}
      guardDisabled={guardDisabled}
      isSaving={addCheckin.isPending}
      item={item}
      offline={offline}
      offlineLabel={offlineLabel}
      severity={severity}
      onCommentChange={setComment}
      onDismiss={() => setDismissed(true)}
      onSave={handleSave}
      onSeverityChange={setSeverity}
    />
  );
}

export function PhysicalReassessmentCard({ item }: { item: PhysicalReassessment }) {
  const notesQuery = usePhysicalNotes();
  const note = notesQuery.data?.find((n) => n.id === item.noteId);

  if (!note || (note.category !== 'PAIN' && note.category !== 'INJURY')) {
    return null;
  }

  return <PhysicalReassessmentEditor item={item} note={note} />;
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
