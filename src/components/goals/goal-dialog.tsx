'use client';

import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';
import { Flag, Target } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { useGoalMutations, type GoalPayload } from '@/hooks/use-data';

const NO_PRIORITY = 'none';

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

export function GoalDialog({ goal, onClose }: GoalDialogProps) {
  const isEdit = Boolean(goal);
  const { create, update } = useGoalMutations();

  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? GoalKind.RACE);
  const [horizon, setHorizon] = useState<GoalHorizon>(goal?.horizon ?? GoalHorizon.MEDIUM_TERM);
  const [priority, setPriority] = useState<string>(goal?.priority ?? 'A');
  const [lowerIsBetter, setLowerIsBetter] = useState(goal?.lowerIsBetter ?? false);
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      kind,
      notes: str('notes'),
    };

    if (kind === GoalKind.RACE) {
      payload.location = str('location');
      payload.targetDate = str('targetDate');
      payload.priority = priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']);
      payload.raceFormat = str('raceFormat');
      payload.targetPerformance = str('targetPerformance');
    } else {
      payload.horizon = horizon;
      payload.metricKey = str('metricKey');
      payload.unit = str('unit');
      payload.startValue = str('startValue') ? Number(str('startValue')) : null;
      payload.currentValue = str('currentValue') ? Number(str('currentValue')) : null;
      payload.targetValue = str('targetValue') ? Number(str('targetValue')) : null;
      payload.lowerIsBetter = lowerIsBetter;
      payload.targetDate = str('targetDate');
    }

    try {
      if (isEdit && goal) {
        await update.mutateAsync({ id: goal.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}</DialogTitle>
          <DialogDescription>
            {kind === GoalKind.RACE
              ? 'Une course cible, avec ton objectif de performance.'
              : 'Un objectif chiffré à suivre dans le temps.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                  kind === GoalKind.RACE
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/60 hover:border-border',
                )}
                onClick={() => setKind(GoalKind.RACE)}
              >
                <Flag className="text-primary size-4 shrink-0" />
                <span>
                  <span className="block font-medium">Course</span>
                  <span className="text-muted-foreground block text-xs">Événement daté</span>
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                  kind === GoalKind.METRIC
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/60 hover:border-border',
                )}
                onClick={() => setKind(GoalKind.METRIC)}
              >
                <Target className="text-primary size-4 shrink-0" />
                <span>
                  <span className="block font-medium">Objectif chiffré</span>
                  <span className="text-muted-foreground block text-xs">Valeur à atteindre</span>
                </span>
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">{kind === GoalKind.RACE ? 'Nom de la course' : 'Titre'}</Label>
            <Input
              defaultValue={goal?.title ?? ''}
              id="title"
              name="title"
              placeholder={kind === GoalKind.RACE ? 'Half Ironman de Versailles' : 'FTP 340 W'}
              required
            />
          </div>

          {kind === GoalKind.RACE ? (
            <>
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
                  <SelectTrigger>
                    <SelectValue />
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
                <p className="text-muted-foreground text-xs">
                  Le résultat que tu vises : chrono, classement, ou simplement finir.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Stratégie &amp; remarques</Label>
                <Textarea
                  defaultValue={goal?.notes ?? ''}
                  id="notes"
                  name="notes"
                  placeholder="Pacing, nutrition, matériel, parcours, points de vigilance…"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Horizon</Label>
                <Select value={horizon} onValueChange={(v) => setHorizon(v as GoalHorizon)}>
                  <SelectTrigger>
                    <SelectValue />
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
                  <Input
                    defaultValue={goal?.unit ?? ''}
                    id="unit"
                    name="unit"
                    placeholder="W, kg, min…"
                  />
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

              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <input
                  checked={lowerIsBetter}
                  className="border-border size-4 rounded"
                  type="checkbox"
                  onChange={(e) => setLowerIsBetter(e.target.checked)}
                />
                Plus bas = meilleur (ex : chrono, poids, FC repos)
              </label>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
              </div>
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={pending} type="submit">
              {getSubmitButtonLabel(pending, isEdit)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
