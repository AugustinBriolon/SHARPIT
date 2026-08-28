'use client';

import { GoalKind, GoalPriority } from '@prisma/client';
import { Calendar, Flag, Repeat, Timer } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import {
  MetricGoalForm,
  type MetricGoalFormResult,
} from '@/components/goals/dialogs/metric-goal-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { priorityDescriptions, priorityLabels, priorityOrder } from '@/lib/goals/goals';
import { cn } from '@/lib/utils';
import type { GoalPayload } from '@/hooks/use-data';

const NO_PRIORITY = 'none';

type GoalFormVariant = 'race' | 'performance' | 'period';

const CREATE_VARIANTS: {
  id: GoalFormVariant;
  label: string;
  icon: typeof Flag;
}[] = [
  { id: 'race', label: 'Course', icon: Flag },
  { id: 'performance', label: 'Temps sur distance', icon: Timer },
  { id: 'period', label: 'Objectif récurrent', icon: Repeat },
];

const RADIO_FOCUS =
  'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden';

function getPriorityLabel(priority: string): string {
  if (priority === NO_PRIORITY) return 'Non définie';
  const p = priority as GoalPriority;
  return `${priorityLabels[p]} — ${priorityDescriptions[p]}`;
}

export type GoalCreateFormProps = {
  submitLabel?: string;
  /** Optional tertiary action (e.g. onboarding « je décide plus tard »). */
  skipLabel?: string;
  onSkip?: () => void;
  onCancel?: () => void;
  onSubmit: (payload: GoalPayload) => void | Promise<void>;
  error?: string | null;
};

/**
 * Same create fields as Progression « Nouvel objectif » — shared by GoalDialog
 * and first-login onboarding.
 */
export function GoalCreateForm({
  submitLabel = 'Créer',
  skipLabel,
  onSkip,
  onCancel,
  onSubmit,
  error: externalError,
}: GoalCreateFormProps) {
  const metricFormId = useId();
  const variantRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [variant, setVariant] = useState<GoalFormVariant>('race');
  const [priority, setPriority] = useState<string>('A');
  const [error, setError] = useState<string | null>(null);

  const displayError = externalError ?? error;

  function focusVariant(index: number) {
    const clamped = Math.max(0, Math.min(CREATE_VARIANTS.length - 1, index));
    variantRefs.current[clamped]?.focus();
  }

  function selectVariantAt(index: number) {
    const option = CREATE_VARIANTS[index];
    if (!option) return;
    setVariant(option.id);
    focusVariant(index);
  }

  function onVariantKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        selectVariantAt((index + 1) % CREATE_VARIANTS.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        selectVariantAt((index - 1 + CREATE_VARIANTS.length) % CREATE_VARIANTS.length);
        break;
      case 'Home':
        event.preventDefault();
        selectVariantAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectVariantAt(CREATE_VARIANTS.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        selectVariantAt(index);
        break;
      default:
        break;
    }
  }

  async function submitPayload(payload: GoalPayload) {
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }

  async function handleRaceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = fd.get(k);
      const s = typeof v === 'string' ? v.trim() : '';
      return s === '' ? null : s;
    };

    await submitPayload({
      title: (fd.get('title') as string)?.trim() ?? '',
      kind: GoalKind.RACE,
      notes: str('notes'),
      location: str('location'),
      targetDate: str('targetDate'),
      priority: priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']),
      raceFormat: str('raceFormat'),
      targetPerformance: str('targetPerformance'),
    });
  }

  async function handleStructuredMetricSubmit(result: MetricGoalFormResult) {
    await submitPayload({
      title: result.title,
      kind: GoalKind.METRIC,
      horizon: result.horizon,
      metricKey: result.metricKey,
      startValue: result.startValue,
      currentValue: result.currentValue,
      targetValue: result.targetValue,
      unit: result.unit,
      lowerIsBetter: result.lowerIsBetter,
      notes: result.notes,
      targetDate: result.targetDate,
    });
  }

  function renderFormActions(submitType: 'submit' | { form: string }) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {skipLabel && onSkip ? (
          <Button
            className="sm:mr-auto"
            type="button"
            variant="ghost"
            onClick={onSkip}
          >
            {skipLabel}
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <Button
          form={typeof submitType === 'object' ? submitType.form : undefined}
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        aria-label="Type d'objectif"
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="radiogroup"
      >
        {CREATE_VARIANTS.map(({ id, label, icon: Icon }, index) => {
          const active = variant === id;
          return (
            <button
              key={id}
              ref={(node) => {
                variantRefs.current[index] = node;
              }}
              aria-checked={active}
              role="radio"
              tabIndex={active ? 0 : -1}
              type="button"
              className={cn(
                'pressable flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 py-1 text-left text-sm',
                RADIO_FOCUS,
                active ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-border',
              )}
              onClick={() => setVariant(id)}
              onKeyDown={(event) => onVariantKeyDown(event, index)}
            >
              <Icon className="text-primary size-4 shrink-0" aria-hidden />
              <span className="block font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {variant === 'race' ? (
        <form className="space-y-4" onSubmit={(e) => void handleRaceSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="goal-create-title">Nom de la course</Label>
            <Input
              id="goal-create-title"
              name="title"
              placeholder="Half Ironman de Versailles"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-create-date">Date</Label>
              <Input id="goal-create-date" name="targetDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-create-location">Lieu</Label>
              <Input id="goal-create-location" name="location" placeholder="Versailles" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v ?? NO_PRIORITY)}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue>{getPriorityLabel(priority)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {priorityOrder.map((p) => (
                  <SelectItem key={p} value={p}>
                    {priorityLabels[p]} — {priorityDescriptions[p]}
                  </SelectItem>
                ))}
                <SelectItem value={NO_PRIORITY}>Non définie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-create-format">Format / distance</Label>
            <Input
              id="goal-create-format"
              name="raceFormat"
              placeholder="Half Ironman, 10 km, Marathon…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-create-perf">Objectif visé</Label>
            <Input
              id="goal-create-perf"
              name="targetPerformance"
              placeholder="Sub 5h00, Top 10, Terminer…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-create-notes">Stratégie &amp; remarques</Label>
            <Textarea id="goal-create-notes" name="notes" rows={3} />
          </div>

          {displayError ? (
            <p className="text-destructive text-sm" role="alert">
              {displayError}
            </p>
          ) : null}
          {renderFormActions('submit')}
        </form>
      ) : (
        <>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            {variant === 'performance' ? (
              <Timer className="size-4 shrink-0" aria-hidden />
            ) : (
              <Calendar className="size-4 shrink-0" aria-hidden />
            )}
            {variant === 'performance' ? 'Temps sur distance' : 'Objectif récurrent'}
          </p>
          <MetricGoalForm
            formId={metricFormId}
            template={variant === 'performance' ? 'performance' : 'period'}
            onError={setError}
            onSubmit={(result) => void handleStructuredMetricSubmit(result)}
          />
          {displayError ? (
            <p className="text-destructive text-sm" role="alert">
              {displayError}
            </p>
          ) : null}
          {renderFormActions({ form: metricFormId })}
        </>
      )}
    </div>
  );
}
