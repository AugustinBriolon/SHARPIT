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
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      role="radio"
      type="button"
      className={cn(
        'pressable-lg min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs font-medium',
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

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label text-muted-foreground">{label}</p>
      <div className="flex gap-1.5" role="radiogroup">
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

function ReassessmentHeader({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-card-title text-sm">{title}</p>
      <button
        aria-label="Ignorer"
        className="text-muted-foreground hover:text-foreground"
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
    <div className="flex items-center justify-between gap-2">
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
}: {
  item: PhysicalReassessment;
  note: ClientPhysicalNote;
}) {
  const { addCheckin } = usePhysicalNoteMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const form = useReassessmentForm(item.suggestedSeverity ?? note.severity ?? 5);

  if (dismissed) {
    return null;
  }

  if (done) {
    return <ReassessmentDoneBanner noteTitle={item.noteTitle} severity={form.state.severity} />;
  }

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
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/80 space-y-3 rounded-xl border p-3">
      <ReassessmentHeader title={item.noteTitle} onDismiss={() => setDismissed(true)} />
      <p className="text-muted-foreground text-xs">{item.question}</p>

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

      <ChoiceRow label="Ce que tu as pu faire">
        {IMPACTS.map((impact) => (
          <ChoiceTile
            key={impact}
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
