'use client';

import { ActivityType, SessionIntensity } from '@prisma/client';
import { format } from 'date-fns';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { BrickAnalysisPanel } from '@/components/planning/brick-analysis-panel';
import { SessionRealization } from '@/components/planning/session-realization';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';
import { intensityLabels, intensityOrder, brickLegActivityTypes } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { usePlannedSessionMutations } from '@/hooks/use-data';

const NO_GOAL = 'none';

type CreateMode = 'single' | 'brick';

type BrickLegForm = {
  type: ActivityType;
  title: string;
  description: string;
  durationMin: string;
  load: string;
  intensity: SessionIntensity;
};

function defaultBrickLegs(): BrickLegForm[] {
  return [
    {
      type: 'BIKE',
      title: 'Vélo',
      description: '',
      durationMin: '',
      load: '',
      intensity: 'ENDURANCE',
    },
    {
      type: 'RUN',
      title: 'Course',
      description: '',
      durationMin: '',
      load: '',
      intensity: 'ENDURANCE',
    },
  ];
}

function brickLegTitlePlaceholder(type: ActivityType): string {
  if (type === 'BIKE') return 'Vélo';
  if (type === 'RUN') return 'Course';
  return activityTypeLabels[type];
}

function submitButtonLabel(pending: boolean, isEdit: boolean, createMode: CreateMode): string {
  if (pending) return 'Enregistrement…';
  if (isEdit) return 'Mettre à jour';
  if (createMode === 'brick') return 'Créer le brick';
  return 'Planifier';
}

interface PlannedSessionDialogProps {
  session?: ClientPlannedSession | null;
  defaultDate?: Date;
  goals?: ClientGoal[];
  onClose: () => void;
}

export function PlannedSessionDialog({
  session,
  defaultDate,
  goals = [],
  onClose,
}: PlannedSessionDialogProps) {
  const isEdit = Boolean(session);
  const { create, createBrick, update, remove } = usePlannedSessionMutations();

  const [createMode, setCreateMode] = useState<CreateMode>('single');
  const [type, setType] = useState<ActivityType>(session?.type ?? 'RUN');
  const [intensity, setIntensity] = useState<SessionIntensity>(session?.intensity ?? 'ENDURANCE');
  const [goalId, setGoalId] = useState<string>(session?.goalId ?? NO_GOAL);
  const [legs, setLegs] = useState<BrickLegForm[]>(defaultBrickLegs);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const initialDate = session?.date ? new Date(session.date) : (defaultDate ?? new Date());

  const raceGoals = goals.filter((g) => g.kind === 'RACE');
  const pending = create.isPending || createBrick.isPending || update.isPending || remove.isPending;

  function updateLeg(index: number, patch: Partial<BrickLegForm>) {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  }

  function addLeg() {
    setLegs((prev) => [
      ...prev,
      {
        type: 'RUN',
        title: '',
        description: '',
        durationMin: '',
        load: '',
        intensity: 'ENDURANCE',
      },
    ]);
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const dateValue = String(formData.get('date') || '');
    const startTimeValue = String(formData.get('startTime') || '');

    try {
      if (isEdit && session) {
        const durationRaw = formData.get('durationMin');
        const loadRaw = formData.get('load');
        await update.mutateAsync({
          id: session.id,
          data: {
            type,
            date: new Date(`${dateValue}T12:00:00`),
            startTime: startTimeValue || null,
            title: (formData.get('title') as string) || null,
            description: (formData.get('description') as string) || null,
            durationMin: durationRaw ? Number(durationRaw) : null,
            load: loadRaw ? Number(loadRaw) : null,
            intensity,
            goalId: goalId === NO_GOAL ? null : goalId,
          },
        });
      } else if (createMode === 'brick') {
        if (legs.length < 2) {
          setError('Un brick nécessite au moins 2 sports (ex. vélo + course).');
          return;
        }
        await createBrick.mutateAsync({
          date: new Date(`${dateValue}T12:00:00`),
          startTime: startTimeValue || null,
          legs: legs.map((leg) => ({
            type: leg.type,
            title: leg.title || null,
            description: leg.description || null,
            durationMin: leg.durationMin ? Number(leg.durationMin) : null,
            load: leg.load ? Number(leg.load) : null,
            intensity: leg.intensity,
          })),
        });
      } else {
        const durationRaw = formData.get('durationMin');
        const loadRaw = formData.get('load');
        await create.mutateAsync({
          type,
          date: new Date(`${dateValue}T12:00:00`),
          startTime: startTimeValue || null,
          title: (formData.get('title') as string) || null,
          description: (formData.get('description') as string) || null,
          durationMin: durationRaw ? Number(durationRaw) : null,
          load: loadRaw ? Number(loadRaw) : null,
          intensity,
          goalId: goalId === NO_GOAL ? null : goalId,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleDelete() {
    if (!session) return;
    const confirmed = await confirm({
      title: 'Supprimer cette séance planifiée ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    setError(null);
    try {
      await remove.mutateAsync(session.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="no-scrollbar max-h-[90vh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Modifier la séance' : 'Planifier une séance'}</DialogTitle>
          </DialogHeader>

          {isEdit && session?.brickGroupId && (
            <>
              <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <Layers className="size-3.5 shrink-0" />
                Cette séance fait partie d&apos;un brick (enchaînement multisport). Tu ne modifies
                ici que ce sport.
              </div>
              <BrickAnalysisPanel brickGroupId={session.brickGroupId} />
            </>
          )}

          {isEdit && session && <SessionRealization session={session} />}

          {!isEdit && (
            <div className="border-border/60 bg-muted/30 flex gap-1 rounded-lg border p-1">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  createMode === 'single'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setCreateMode('single')}
              >
                Séance simple
              </button>
              <button
                type="button"
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  createMode === 'brick'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setCreateMode('brick')}
              >
                <Layers className="size-3.5" />
                Brick
              </button>
            </div>
          )}

          <form className="min-w-0 space-y-4" onSubmit={handleSubmit}>
            {createMode === 'single' && (
              <div className="min-w-0 space-y-2">
                <Label>Sport</Label>
                <Select
                  disabled={isEdit}
                  value={type}
                  onValueChange={(v) => setType(v as ActivityType)}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue>{activityTypeLabels[type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ActivityType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {activityTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  className="min-w-0"
                  defaultValue={format(initialDate, 'yyyy-MM-dd')}
                  id="date"
                  name="date"
                  type="date"
                  required
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="startTime">Heure (optionnel)</Label>
                <Input
                  className="min-w-0"
                  defaultValue={session?.startTime ?? ''}
                  id="startTime"
                  name="startTime"
                  type="time"
                />
              </div>
            </div>
            <p className="text-muted-foreground -mt-1 text-xs">
              Laisse l&apos;heure vide pour que le créneau soit choisi automatiquement dans ton
              agenda Google.
            </p>

            {createMode === 'single' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    defaultValue={session?.title ?? ''}
                    id="title"
                    name="title"
                    placeholder="Sortie longue Z2"
                  />
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label>Intensité</Label>
                    <Select
                      value={intensity}
                      onValueChange={(v) => setIntensity(v as SessionIntensity)}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue>{intensityLabels[intensity]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {intensityOrder.map((i) => (
                          <SelectItem key={i} value={i}>
                            {intensityLabels[i]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label>Objectif lié</Label>
                    <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue>
                          {goalId === NO_GOAL
                            ? 'Aucun'
                            : (raceGoals.find((g) => g.id === goalId)?.title ?? 'Aucun')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_GOAL}>Aucun</SelectItem>
                        {raceGoals.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="durationMin">Durée (min)</Label>
                    <Input
                      defaultValue={session?.durationMin ?? ''}
                      id="durationMin"
                      min={0}
                      name="durationMin"
                      placeholder="90"
                      type="number"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="load">Charge prévue (TSS)</Label>
                    <Input
                      defaultValue={session?.load ?? ''}
                      id="load"
                      min={0}
                      name="load"
                      placeholder="auto si vide"
                      step="any"
                      type="number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    defaultValue={session?.description ?? ''}
                    id="description"
                    name="description"
                    placeholder="3×10' au seuil, récup 3'…"
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  Chaque sport de l&apos;enchaînement devient une séance à part (une activité Strava
                  liée, une analyse).
                </p>
                {legs.map((leg, index) => (
                  <div
                    key={index}
                    className="border-border/60 bg-card/30 space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Étape {index + 1}
                      </span>
                      {legs.length > 2 && (
                        <button
                          aria-label="Supprimer cette étape"
                          className="text-muted-foreground hover:text-destructive"
                          type="button"
                          onClick={() => removeLeg(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 space-y-2">
                        <Label>Sport</Label>
                        <Select
                          value={leg.type}
                          onValueChange={(v) => updateLeg(index, { type: v as ActivityType })}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue>{activityTypeLabels[leg.type]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {brickLegActivityTypes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {activityTypeLabels[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label>Intensité</Label>
                        <Select
                          value={leg.intensity}
                          onValueChange={(v) =>
                            updateLeg(index, {
                              intensity: v as SessionIntensity,
                            })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue>{intensityLabels[leg.intensity]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {intensityOrder.map((i) => (
                              <SelectItem key={i} value={i}>
                                {intensityLabels[i]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input
                        placeholder={brickLegTitlePlaceholder(leg.type)}
                        value={leg.title}
                        onChange={(e) => updateLeg(index, { title: e.target.value })}
                      />
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 space-y-2">
                        <Label>Durée (min)</Label>
                        <Input
                          min={0}
                          placeholder="40"
                          type="number"
                          value={leg.durationMin}
                          onChange={(e) => updateLeg(index, { durationMin: e.target.value })}
                        />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label>TSS</Label>
                        <Input
                          min={0}
                          placeholder="auto"
                          type="number"
                          value={leg.load}
                          onChange={(e) => updateLeg(index, { load: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Structure de la séance…"
                        rows={2}
                        value={leg.description}
                        onChange={(e) => updateLeg(index, { description: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <Button size="sm" type="button" variant="outline" onClick={addLeg}>
                  <Plus className="size-4" />
                  Ajouter un sport
                </Button>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex items-center justify-between gap-2">
              <div>
                {isEdit && (
                  <Button
                    disabled={pending}
                    size="sm"
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button disabled={pending} type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button disabled={pending} type="submit">
                  {submitButtonLabel(pending, isEdit, createMode)}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
