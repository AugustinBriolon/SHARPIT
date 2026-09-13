'use client';

import { startOfDay } from 'date-fns';
import { Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { usePhysicalNoteMutations, usePhysicalNotes } from '@/hooks/use-physical';
import { severityColor } from '@/lib/physical-health/physical';
import {
  impactForTrend,
  impactLabel,
  impactToFunctionalImpact,
  severityForTrend,
  trendLabel,
  type ImpactChoice,
  type ReassessmentTrend,
} from '@/lib/physical-health/reassessment-input';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import type { SessionAnalysis } from '@/lib/validators/coach';

export type PhysicalReassessment = NonNullable<SessionAnalysis['physicalReassessments']>[number];

const TRENDS: readonly ReassessmentTrend[] = ['better', 'same', 'worse'];
const IMPACTS: readonly ImpactChoice[] = ['normal', 'reduced', 'stopped'];

function ChoiceTile({
  label,
  selected,
  onSelect,
  stacked = false,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Full-width stack for long labels (capacity) — avoids cramped 3-up chips. */
  stacked?: boolean;
}) {
  return (
    <button
      aria-checked={selected}
      role="radio"
      type="button"
      className={cn(
        'pressable-lg min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm font-medium',
        stacked ? 'w-full' : 'flex-1',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground'
          : 'border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

function ChoiceRow({
  label,
  stacked = false,
  children,
}: {
  label: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-label text-muted-foreground">{label}</p>
      <div className={cn(stacked ? 'flex flex-col gap-2' : 'flex gap-2')} role="radiogroup">
        {children}
      </div>
    </div>
  );
}

/** 0-10 in one row — a slider hides the value it is setting. */
function SeverityScale({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <p className="text-label text-muted-foreground">Douleur ressentie</p>
        <span className={cn('text-data text-sm font-semibold', severityColor(value))}>
          {value}/10
        </span>
      </div>
      <div className="flex gap-1" role="radiogroup">
        {Array.from({ length: 11 }, (_, level) => (
          <button
            key={level}
            aria-checked={level === value}
            aria-label={`${level} sur 10`}
            role="radio"
            type="button"
            className={cn(
              'pressable min-h-9 flex-1 rounded-md border text-[0.7rem] font-medium tabular-nums',
              level === value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border/60 text-muted-foreground hover:border-primary/30',
            )}
            onClick={() => onChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

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

type FormState = {
  trend: ReassessmentTrend | null;
  severity: number;
  impact: ImpactChoice | null;
  comment: string;
  detailed: boolean;
};

function useReassessmentForm(initialSeverity: number) {
  const [state, setState] = useState<FormState>({
    trend: null,
    severity: initialSeverity,
    impact: null,
    comment: '',
    detailed: false,
  });

  function pickTrend(trend: ReassessmentTrend) {
    setState((prev) => ({
      ...prev,
      trend,
      severity: severityForTrend(initialSeverity, trend),
      impact: impactForTrend(trend, prev.impact),
    }));
  }

  return {
    state,
    pickTrend,
    setImpact: (impact: ImpactChoice) => setState((prev) => ({ ...prev, impact })),
    setSeverity: (severity: number) => setState((prev) => ({ ...prev, severity })),
    setComment: (comment: string) => setState((prev) => ({ ...prev, comment })),
    toggleDetail: () => setState((prev) => ({ ...prev, detailed: !prev.detailed })),
  };
}

function ReassessmentHeader({
  title,
  positionLabel,
  onDismiss,
}: {
  title: string;
  positionLabel?: string | null;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-1">
        {positionLabel ? <p className="text-label text-muted-foreground">{positionLabel}</p> : null}
        <p className="text-card-title text-sm">{title}</p>
      </div>
      <button
        aria-label="Ignorer"
        className="text-muted-foreground hover:text-foreground shrink-0"
        type="button"
        onClick={onDismiss}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

type ReassessmentForm = ReturnType<typeof useReassessmentForm>;

function ReassessmentDetail({ form }: { form: ReassessmentForm }) {
  if (!form.state.detailed) {
    return null;
  }
  return (
    <div className="space-y-2.5">
      <SeverityScale value={form.state.severity} onChange={form.setSeverity} />
      <Textarea
        className="min-h-0 text-xs"
        placeholder="Ce que tu as senti…"
        rows={2}
        value={form.state.comment}
        onChange={(e) => form.setComment(e.target.value)}
      />
    </div>
  );
}

function ReassessmentFooter({
  detailed,
  disabled,
  label,
  saving,
  onSave,
  onToggleDetail,
}: {
  detailed: boolean;
  disabled: boolean;
  label: string;
  saving: boolean;
  onSave: () => void;
  onToggleDetail: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        type="button"
        onClick={onToggleDetail}
      >
        {detailed ? 'Masquer le détail' : 'Préciser'}
      </button>
      <Button disabled={disabled} size="sm" type="button" onClick={onSave}>
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {label}
      </Button>
    </div>
  );
}

function PhysicalReassessmentEditor({
  item,
  note,
  positionLabel,
  onResolved,
}: {
  item: PhysicalReassessment;
  note: ClientPhysicalNote;
  positionLabel?: string | null;
  onResolved?: (
    result: { kind: 'saved'; noteTitle: string; severity: number } | { kind: 'dismissed' },
  ) => void;
}) {
  const { addCheckin } = usePhysicalNoteMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const form = useReassessmentForm(item.suggestedSeverity ?? note.severity ?? 5);

  function handleSave() {
    if (guardDisabled || !form.state.impact) {
      return;
    }
    addCheckin.mutate(
      {
        id: item.noteId,
        data: {
          severity: form.state.severity,
          comment: form.state.comment.trim() || null,
          functionalImpact: impactToFunctionalImpact(form.state.impact),
        },
      },
      {
        onSuccess: () => {
          onResolved?.({
            kind: 'saved',
            noteTitle: item.noteTitle,
            severity: form.state.severity,
          });
        },
      },
    );
  }

  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/80 space-y-4 rounded-xl border p-4">
      <ReassessmentHeader
        positionLabel={positionLabel}
        title={item.noteTitle}
        onDismiss={() => onResolved?.({ kind: 'dismissed' })}
      />
      <p className="text-muted-foreground text-sm leading-snug">{item.question}</p>

      <ChoiceRow label="Par rapport à la dernière fois">
        {TRENDS.map((trend) => (
          <ChoiceTile
            key={trend}
            label={trendLabel(trend)}
            selected={form.state.trend === trend}
            onSelect={() => form.pickTrend(trend)}
          />
        ))}
      </ChoiceRow>

      <ChoiceRow label="Ce que tu as pu faire" stacked>
        {IMPACTS.map((impact) => (
          <ChoiceTile
            key={impact}
            stacked
            label={impactLabel(impact)}
            selected={form.state.impact === impact}
            onSelect={() => form.setImpact(impact)}
          />
        ))}
      </ChoiceRow>

      <ReassessmentDetail form={form} />

      <ReassessmentFooter
        detailed={form.state.detailed}
        disabled={guardDisabled || addCheckin.isPending || !form.state.impact}
        label={offline ? offlineLabel : 'Enregistrer'}
        saving={addCheckin.isPending}
        onSave={handleSave}
        onToggleDetail={form.toggleDetail}
      />
    </div>
  );
}

export function PhysicalReassessmentCard({
  item,
  positionLabel,
  onResolved,
}: {
  item: PhysicalReassessment;
  positionLabel?: string | null;
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
      item={item}
      note={note}
      positionLabel={positionLabel}
      onResolved={onResolved}
    />
  );
}

/** Focus queue: one injury at a time; advance after save / dismiss. */
export function PhysicalReassessmentQueue({ items }: { items: PhysicalReassessment[] }) {
  const [index, setIndex] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ noteTitle: string; severity: number } | null>(null);

  if (items.length === 0) {
    return null;
  }

  if (index >= items.length) {
    return lastSaved ? (
      <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
    ) : null;
  }

  const current = items[index];
  const remainingAfter = items.length - index - 1;
  const positionLabel = items.length > 1 ? `Douleur ${index + 1} sur ${items.length}` : null;

  return (
    <div className="space-y-2">
      {lastSaved ? (
        <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
      ) : null}
      <PhysicalReassessmentCard
        key={current.noteId}
        item={current}
        positionLabel={positionLabel}
        onResolved={(result) => {
          if (result.kind === 'saved') {
            setLastSaved({ noteTitle: result.noteTitle, severity: result.severity });
          }
          setIndex((prev) => prev + 1);
        }}
      />
      {remainingAfter > 0 ? (
        <p className="text-muted-foreground text-xs">
          Encore {remainingAfter} douleur{remainingAfter > 1 ? 's' : ''} à suivre après celle-ci.
        </p>
      ) : null}
    </div>
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
