'use client';

import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { severityColor } from '@sharpit/server/lib/physical-health/physical';
import {
  impactForTrend,
  impactLabel,
  impactShortLabel,
  severityForTrend,
  trendLabel,
  type ImpactChoice,
  type ReassessmentTrend,
} from '@sharpit/server/lib/physical-health/reassessment-input';
import { useReassessmentSave } from '@/components/planning/session/realize/use-reassessment-save';
import { reassessmentChipLabel } from '@sharpit/server/lib/physical-health/reassessment-pager';
import {
  ADEQUATE_TONE,
  CAUTION_TONE,
} from '@sharpit/server/lib/presentation/coaching/status-surface';
import type { ClientPhysicalNote } from '@sharpit/server/lib/query/types';
import { cn } from '@sharpit/server/lib/utils';
import type { PhysicalReassessment } from '@/components/planning/session/realize/physical-reassessment-card';

const TRENDS: readonly ReassessmentTrend[] = ['better', 'same', 'worse'];
const IMPACTS: readonly ImpactChoice[] = ['normal', 'reduced', 'stopped'];

const TREND_ICONS: Record<ReassessmentTrend, LucideIcon> = {
  better: TrendingDown,
  same: Minus,
  worse: TrendingUp,
};

const segmentBase =
  'pressable-lg flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-center transition-colors';
const segmentIdle =
  'border-foreground/20 bg-background text-foreground hover:border-highlight/55 hover:bg-muted/50';
const segmentActive = 'border-highlight bg-highlight text-highlight-foreground shadow-sm';

function trendIconClass(trend: ReassessmentTrend, selected: boolean): string {
  if (selected) {
    return 'text-highlight-foreground';
  }
  if (trend === 'better') {
    return ADEQUATE_TONE.colorClass;
  }
  if (trend === 'worse') {
    return CAUTION_TONE.colorClass;
  }
  return 'text-muted-foreground';
}

function ChoiceSegment({
  label,
  ariaLabel,
  selected,
  onSelect,
}: {
  label: string;
  ariaLabel?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      aria-label={ariaLabel ?? label}
      className={cn(segmentBase, selected ? segmentActive : segmentIdle)}
      role="radio"
      type="button"
      onClick={onSelect}
    >
      <span className="text-xs leading-tight font-semibold">{label}</span>
    </button>
  );
}

function TrendSegment({
  trend,
  selected,
  onSelect,
}: {
  trend: ReassessmentTrend;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = TREND_ICONS[trend];
  return (
    <button
      aria-checked={selected}
      aria-label={trendLabel(trend)}
      role="radio"
      type="button"
      className={cn(
        segmentBase,
        'flex-col gap-0.5 sm:flex-row',
        selected ? segmentActive : segmentIdle,
      )}
      onClick={onSelect}
    >
      <Icon
        className={cn('size-3.5 shrink-0', trendIconClass(trend, selected))}
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="text-xs leading-tight font-semibold">{trendLabel(trend)}</span>
    </button>
  );
}

function ChoiceSegmentGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-label text-foreground/75">{label}</p>
      <div aria-label={label} className="grid grid-cols-3 gap-1.5" role="radiogroup">
        {children}
      </div>
    </div>
  );
}

function SeverityScale({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <p className="text-label text-foreground/75">Douleur ressentie</p>
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
                : 'border-foreground/15 bg-background text-foreground/85 hover:border-highlight/50',
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

type ReassessmentForm = ReturnType<typeof useReassessmentForm>;

function SeverityAndDetailRow({
  trend,
  severity,
  baseline,
  detailed,
  onToggleDetail,
}: {
  trend: ReassessmentTrend | null;
  severity: number;
  baseline: number;
  detailed: boolean;
  onToggleDetail: () => void;
}) {
  const shown = trend ? severity : baseline;
  const caption = trend ? 'Proposée' : 'Actuelle';

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs tabular-nums">
        <span className="text-foreground/65">{caption} </span>
        <span className={cn('text-data font-semibold', severityColor(shown))}>
          {trend ? `→ ${shown}/10` : `${shown}/10`}
        </span>
      </p>
      <button
        aria-expanded={detailed}
        className="text-foreground/75 hover:text-foreground pressable inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium"
        type="button"
        onClick={onToggleDetail}
      >
        {detailed ? (
          <ChevronUp className="size-3.5" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5" aria-hidden />
        )}
        {detailed ? 'Masquer' : 'Préciser'}
      </button>
    </div>
  );
}

function ReassessmentDetail({ form }: { form: ReassessmentForm }) {
  if (!form.state.detailed) {
    return null;
  }
  return (
    <div className="bg-background/60 border-foreground/15 space-y-2.5 rounded-lg border px-2.5 py-2.5">
      <SeverityScale value={form.state.severity} onChange={form.setSeverity} />
      <Textarea
        className="bg-background/40 min-h-0 text-xs"
        placeholder="Ce que tu as senti…"
        rows={2}
        value={form.state.comment}
        onChange={(e) => form.setComment(e.target.value)}
      />
    </div>
  );
}

function ReassessmentEditorHeader({
  item,
  hideTitle,
  baseline,
  onDismiss,
}: {
  item: PhysicalReassessment;
  hideTitle?: boolean;
  baseline: number;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        {hideTitle ? null : (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-card-title min-w-0 text-sm">
              {reassessmentChipLabel(item.noteTitle)}
            </p>
            <span
              className={cn(
                'text-data text-xs font-semibold tabular-nums',
                severityColor(baseline),
              )}
            >
              {baseline}/10
            </span>
          </div>
        )}
        <p className="text-foreground text-sm leading-snug text-pretty">{item.question}</p>
      </div>
      <button
        aria-label="Ignorer"
        className="text-muted-foreground hover:text-foreground pressable inline-flex size-9 shrink-0 items-center justify-center rounded-md"
        type="button"
        onClick={onDismiss}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function ReassessmentTrendPicker({ form }: { form: ReassessmentForm }) {
  return (
    <ChoiceSegmentGroup label="Par rapport à la dernière fois">
      {TRENDS.map((trend) => (
        <TrendSegment
          key={trend}
          selected={form.state.trend === trend}
          trend={trend}
          onSelect={() => form.pickTrend(trend)}
        />
      ))}
    </ChoiceSegmentGroup>
  );
}

function ReassessmentImpactPicker({ form }: { form: ReassessmentForm }) {
  return (
    <ChoiceSegmentGroup label="Ce que tu as pu faire">
      {IMPACTS.map((impact) => (
        <ChoiceSegment
          key={impact}
          ariaLabel={impactLabel(impact)}
          label={impactShortLabel(impact)}
          selected={form.state.impact === impact}
          onSelect={() => form.setImpact(impact)}
        />
      ))}
    </ChoiceSegmentGroup>
  );
}

function ReassessmentSaveButton({
  canSave,
  pending,
  offline,
  offlineLabel,
  onSave,
}: {
  canSave: boolean;
  pending: boolean;
  offline: boolean;
  offlineLabel: string;
  onSave: () => void;
}) {
  return (
    <Button
      className="w-full"
      disabled={!canSave}
      size="sm"
      type="button"
      variant={canSave ? 'highlight' : 'default'}
      onClick={onSave}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      {offline ? offlineLabel : 'Enregistrer'}
    </Button>
  );
}

export function PhysicalReassessmentEditor({
  item,
  note,
  hideTitle,
  onResolved,
}: {
  item: PhysicalReassessment;
  note: ClientPhysicalNote;
  hideTitle?: boolean;
  onResolved?: (
    result: { kind: 'saved'; noteTitle: string; severity: number } | { kind: 'dismissed' },
  ) => void;
}) {
  const baseline = item.suggestedSeverity ?? note.severity ?? 5;
  const form = useReassessmentForm(baseline);
  const save = useReassessmentSave(item, form, onResolved);

  return (
    <div className="space-y-2.5">
      <ReassessmentEditorHeader
        baseline={baseline}
        hideTitle={hideTitle}
        item={item}
        onDismiss={() => onResolved?.({ kind: 'dismissed' })}
      />
      <ReassessmentTrendPicker form={form} />
      <ReassessmentImpactPicker form={form} />
      <SeverityAndDetailRow
        baseline={baseline}
        detailed={form.state.detailed}
        severity={form.state.severity}
        trend={form.state.trend}
        onToggleDetail={form.toggleDetail}
      />
      <ReassessmentDetail form={form} />
      <ReassessmentSaveButton
        canSave={save.canSave}
        offline={save.offline}
        offlineLabel={save.offlineLabel}
        pending={save.pending}
        onSave={save.handleSave}
      />
    </div>
  );
}
