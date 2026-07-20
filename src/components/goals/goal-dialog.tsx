'use client';

import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';
import { Calendar, Flag, Repeat, Timer } from 'lucide-react';
import { useId, useState } from 'react';
import { MetricGoalForm, type MetricGoalFormResult } from '@/components/goals/metric-goal-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  horizonLabels,
  horizonOrder,
  priorityDescriptions,
  priorityLabels,
  priorityOrder,
} from '@/lib/goals';
import { parseGoalMetricConfig } from '@/lib/goal-metric-config';
import { cn } from '@/lib/utils';
import { useGoalMutations, type GoalPayload } from '@/hooks/use-data';

const NO_PRIORITY = 'none';

type GoalFormVariant = 'race' | 'performance' | 'period' | 'legacy';

function initialVariant(goal: GoalForEdit | null | undefined): GoalFormVariant {
  if (!goal) return 'race';
  if (goal.kind === GoalKind.RACE) return 'race';
  const config = parseGoalMetricConfig(goal.metricKey);
  if (config?.template === 'performance') return 'performance';
  if (config?.template === 'period') return 'period';
  return 'legacy';
}

export interface GoalForEdit {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: GoalHorizon | null;
  metricKey?: string | null;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  lowerIsBetter: boolean;
  targetDate: string | Date | null;
  location: string | null;
  notes: string | null;
  priority: GoalPriority | null;
  raceFormat: string | null;
  targetPerformance: string | null;
  validatingActivityId?: string | null;
  lastAchievedAt?: string | Date | null;
}

interface GoalDialogProps {
  goal?: GoalForEdit | null;
  onClose: () => void;
}

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function getSubmitButtonLabel(pending: boolean, isEdit: boolean): string {
  if (pending) return 'Enregistrement…';
  if (isEdit) return 'Enregistrer';
  return 'Créer';
}

function getPriorityLabel(priority: string): string {
  if (priority === NO_PRIORITY) return 'Non définie';
  const p = priority as GoalPriority;
  return `${priorityLabels[p]} — ${priorityDescriptions[p]}`;
}

export function GoalDialog({ goal, onClose }: GoalDialogProps) {
  const isEdit = Boolean(goal);
  const metricFormId = useId();
  const { create, update } = useGoalMutations();

  const [variant, setVariant] = useState<GoalFormVariant>(initialVariant(goal));
  const [priority, setPriority] = useState<string>(goal?.priority ?? 'A');
  const [error, setError] = useState<string | null>(null);

  const [legacyHorizon, setLegacyHorizon] = useState<GoalHorizon>(
    goal?.horizon ?? GoalHorizon.MEDIUM_TERM,
  );
  const [legacyLowerIsBetter, setLegacyLowerIsBetter] = useState(goal?.lowerIsBetter ?? false);

  const pending = create.isPending || update.isPending;

  async function submitPayload(payload: GoalPayload) {
    if (isEdit && goal) {
      update.mutate(
        { id: goal.id, data: payload },
        {
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
          },
        },
      );
    } else {
      create.mutate(payload, {
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        },
      });
    }
    onClose();
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

    const payload: GoalPayload = {
      title: (fd.get('title') as string)?.trim() ?? '',
      kind: GoalKind.RACE,
      notes: str('notes'),
      location: str('location'),
      targetDate: str('targetDate'),
      priority: priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']),
      raceFormat: str('raceFormat'),
      targetPerformance: str('targetPerformance'),
    };

    await submitPayload(payload);
  }

  async function handleLegacyMetricSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = fd.get(k);
      const s = typeof v === 'string' ? v.trim() : '';
      return s === '' ? null : s;
    };

    const payload: GoalPayload = {
      title: (fd.get('title') as string)?.trim() ?? '',
      kind: GoalKind.METRIC,
      notes: str('notes'),
      horizon: legacyHorizon,
      metricKey: str('metricKey'),
      unit: str('unit'),
      startValue: str('startValue') ? Number(str('startValue')) : null,
      currentValue: str('currentValue') ? Number(str('currentValue')) : null,
      targetValue: str('targetValue') ? Number(str('targetValue')) : null,
      lowerIsBetter: legacyLowerIsBetter,
      targetDate: str('targetDate'),
    };

    await submitPayload(payload);
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

  const useStructuredMetricForm = variant === 'performance' || variant === 'period';

  function renderFormActions(submitType: 'submit' | { form: string }) {
    return (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={pending}
          form={typeof submitType === 'object' ? submitType.form : undefined}
          type="submit"
        >
          {getSubmitButtonLabel(pending, isEdit)}
        </Button>
      </div>
    );
  }

  function renderRaceForm() {
    return (
      <form className="space-y-4" onSubmit={handleRaceSubmit}>
        <div className="space-y-2">
          <Label htmlFor="title">Nom de la course</Label>
          <Input
            defaultValue={goal?.title ?? ''}
            id="title"
            name="title"
            placeholder="Half Ironman de Versailles"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="targetDate">Date</Label>
            <Input
              defaultValue={toDateInput(goal?.targetDate)}
              id="targetDate"
              name="targetDate"
              type="date"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              defaultValue={goal?.location ?? ''}
              id="location"
              name="location"
              placeholder="Versailles"
            />
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
          <Label htmlFor="raceFormat">Format / distance</Label>
          <Input
            defaultValue={goal?.raceFormat ?? ''}
            id="raceFormat"
            name="raceFormat"
            placeholder="Half Ironman, 10 km, Marathon…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetPerformance">Objectif visé</Label>
          <Input
            defaultValue={goal?.targetPerformance ?? ''}
            id="targetPerformance"
            name="targetPerformance"
            placeholder="Sub 5h00, Top 10, Terminer…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Stratégie &amp; remarques</Label>
          <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={3} />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {renderFormActions('submit')}
      </form>
    );
  }

  function renderStructuredMetricForm() {
    const template = variant === 'performance' ? 'performance' : 'period';
    return (
      <>
        <MetricGoalForm
          formId={metricFormId}
          goal={goal}
          template={template}
          onError={setError}
          onSubmit={handleStructuredMetricSubmit}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        {renderFormActions({ form: metricFormId })}
      </>
    );
  }

  function renderLegacyMetricForm() {
    return (
      <form className="space-y-4" onSubmit={handleLegacyMetricSubmit}>
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input defaultValue={goal?.title ?? ''} id="title" name="title" required />
        </div>

        <div className="space-y-2">
          <Label>Horizon</Label>
          <Select
            value={legacyHorizon}
            onValueChange={(v) => v && setLegacyHorizon(v as GoalHorizon)}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{horizonLabels[legacyHorizon]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {horizonOrder.map((h) => (
                <SelectItem key={h} value={h}>
                  {horizonLabels[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startValue">Départ</Label>
            <Input
              defaultValue={goal?.startValue ?? ''}
              id="startValue"
              name="startValue"
              step="any"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentValue">Actuel</Label>
            <Input
              defaultValue={goal?.currentValue ?? ''}
              id="currentValue"
              name="currentValue"
              step="any"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetValue">Cible</Label>
            <Input
              defaultValue={goal?.targetValue ?? ''}
              id="targetValue"
              name="targetValue"
              step="any"
              type="number"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="unit">Unité</Label>
            <Input defaultValue={goal?.unit ?? ''} id="unit" name="unit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetDate">Échéance</Label>
            <Input
              defaultValue={toDateInput(goal?.targetDate)}
              id="targetDate"
              name="targetDate"
              type="date"
            />
          </div>
        </div>

        <label className="text-foreground flex items-center gap-2.5 text-sm">
          <Checkbox
            checked={legacyLowerIsBetter}
            onCheckedChange={(checked) => setLegacyLowerIsBetter(checked === true)}
          />
          Plus bas = meilleur
        </label>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {renderFormActions('submit')}
      </form>
    );
  }

  function renderGoalForm() {
    if (variant === 'race') return renderRaceForm();
    if (useStructuredMetricForm) return renderStructuredMetricForm();
    return renderLegacyMetricForm();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        {!isEdit && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                variant === 'race'
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/60 hover:border-border',
              )}
              onClick={() => setVariant('race')}
            >
              <Flag className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">Course</span>
              </span>
            </button>
            <button
              type="button"
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                variant === 'performance'
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/60 hover:border-border',
              )}
              onClick={() => setVariant('performance')}
            >
              <Timer className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">Temps sur distance</span>
              </span>
            </button>
            <button
              type="button"
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                variant === 'period'
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/60 hover:border-border',
              )}
              onClick={() => setVariant('period')}
            >
              <Repeat className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">Objectif récurrent</span>
              </span>
            </button>
          </div>
        )}

        {isEdit && variant !== 'race' && variant !== 'legacy' && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            {variant === 'performance' ? (
              <Timer className="size-4 shrink-0" />
            ) : (
              <Calendar className="size-4 shrink-0" />
            )}
            {variant === 'performance' ? 'Temps sur distance' : 'Objectif récurrent'}
          </p>
        )}

        {renderGoalForm()}
      </DialogContent>
    </Dialog>
  );
}
