'use client';

import { ActivityType, SessionIntensity } from '@prisma/client';
import { format } from 'date-fns';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PlannedSessionReadView } from '@/components/planning/planned-session-read-view';
import {
  LocationPlacePicker,
  type LocationPlaceValue,
} from '@/components/planning/location-place-picker';
import {
  defaultExposureForActivityType,
  sportSupportsOutdoorContext,
} from '@/core/planned-session/defaults';
import { queryKeys } from '@/lib/query/keys';
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
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';
import {
  intensityLabels,
  intensityOrder,
  brickLegActivityTypes,
  exposureLabels,
} from '@/lib/sessions';
import { cn } from '@/lib/utils';
import {
  usePlannedSessionMutations,
  usePlannedSessionPresentation,
  usePlannedSessions,
} from '@/hooks/use-data';

type LocationSource = 'home' | 'travel' | 'custom';

function initialCustomPlace(session?: ClientPlannedSession | null): LocationPlaceValue {
  if (session?.locationLat != null && session.locationLng != null && session.locationLabel) {
    return {
      label: session.locationLabel,
      latitude: session.locationLat,
      longitude: session.locationLng,
    };
  }
  return null;
}

function initialLocationSource(session?: ClientPlannedSession | null): LocationSource {
  if (session?.locationLat != null && session.locationLng != null) return 'custom';
  return 'home';
}

const NO_GOAL = 'none';

type DialogMode = 'read' | 'edit';
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

function dialogTitle(isEdit: boolean, mode: DialogMode, hasActivity: boolean): string {
  if (!isEdit) return 'Planifier une séance';
  if (mode === 'edit') return 'Modifier la séance';
  return hasActivity ? 'Séance réalisée' : 'Séance planifiée';
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
  const queryClient = useQueryClient();
  const isEdit = Boolean(session);
  const { create, createBrick, update, remove } = usePlannedSessionMutations();
  const plannedQuery = usePlannedSessions();
  const liveSession = useMemo(() => {
    if (!session?.id) return session ?? null;
    return plannedQuery.data?.find((item) => item.id === session.id) ?? session;
  }, [plannedQuery.data, session]);

  const [mode, setMode] = useState<DialogMode>(isEdit ? 'read' : 'edit');
  const [formKey, setFormKey] = useState(0);
  const [createMode, setCreateMode] = useState<CreateMode>('single');
  const [type, setType] = useState<ActivityType>(session?.type ?? 'RUN');
  const [intensity, setIntensity] = useState<SessionIntensity>(session?.intensity ?? 'ENDURANCE');
  const [goalId, setGoalId] = useState<string>(session?.goalId ?? NO_GOAL);
  const [exposure, setExposure] = useState<'INDOOR' | 'OUTDOOR' | 'UNKNOWN'>(
    (session?.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined) ??
      defaultExposureForActivityType(session?.type ?? 'RUN'),
  );
  const [locationSource, setLocationSource] = useState<LocationSource>(
    initialLocationSource(session),
  );
  const [customPlace, setCustomPlace] = useState<LocationPlaceValue>(initialCustomPlace(session));
  const [legs, setLegs] = useState<BrickLegForm[]>(defaultBrickLegs);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const initialDate = session?.date ? new Date(session.date) : (defaultDate ?? new Date());

  const raceGoals = goals.filter((g) => g.kind === 'RACE');
  const pending = create.isPending || createBrick.isPending || update.isPending || remove.isPending;
  const showOutdoorContext = createMode === 'single' && sportSupportsOutdoorContext(type);

  const contextQuery = usePlannedSessionPresentation(isEdit ? session?.id : null);

  const homeQuery = useQuery({
    queryKey: ['geocoding', 'home'],
    queryFn: async () => {
      const res = await fetch('/api/geocoding/home');
      if (!res.ok) throw new Error('home fetch failed');
      return res.json() as Promise<{
        home: { label?: string; latitude: number; longitude: number };
      }>;
    },
    staleTime: 5 * 60_000,
  });

  const travelQuery = useQuery({
    queryKey: ['travel-context'],
    queryFn: async () => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) throw new Error('travel fetch failed');
      return res.json() as Promise<{
        active: {
          locationLabel: string;
          locationLat: number;
          locationLng: number;
        } | null;
      }>;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isEdit || session) return;
    const active = travelQuery.data?.active;
    if (!active) return;
    setExposure('OUTDOOR');
    setLocationSource('travel');
    setCustomPlace({
      label: active.locationLabel,
      latitude: active.locationLat,
      longitude: active.locationLng,
    });
  }, [isEdit, session, travelQuery.data?.active]);

  useEffect(() => {
    if (!showOutdoorContext && type === 'STRENGTH') {
      setExposure('INDOOR');
    }
  }, [type, showOutdoorContext]);

  function resetFormFromSession() {
    if (!session) return;
    setType(session.type);
    setIntensity(session.intensity ?? 'ENDURANCE');
    setGoalId(session.goalId ?? NO_GOAL);
    setExposure(
      (session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined) ??
        defaultExposureForActivityType(session.type),
    );
    setLocationSource(initialLocationSource(session));
    setCustomPlace(initialCustomPlace(session));
  }

  function resolveLocationPayload(): {
    locationLabel: string | null;
    locationLat: number | null;
    locationLng: number | null;
  } {
    if (!showOutdoorContext || exposure === 'INDOOR') {
      return { locationLabel: null, locationLat: null, locationLng: null };
    }

    if (locationSource === 'home' && homeQuery.data?.home) {
      return {
        locationLabel: homeQuery.data.home.label ?? 'Colombes, France',
        locationLat: homeQuery.data.home.latitude,
        locationLng: homeQuery.data.home.longitude,
      };
    }

    if (locationSource === 'travel' && travelQuery.data?.active) {
      return {
        locationLabel: travelQuery.data.active.locationLabel,
        locationLat: travelQuery.data.active.locationLat,
        locationLng: travelQuery.data.active.locationLng,
      };
    }

    if (customPlace) {
      return {
        locationLabel: customPlace.label,
        locationLat: customPlace.latitude,
        locationLng: customPlace.longitude,
      };
    }

    return { locationLabel: null, locationLat: null, locationLng: null };
  }

  function handleStartEdit() {
    resetFormFromSession();
    setFormKey((k) => k + 1);
    setMode('edit');
  }

  function handleCancelEdit() {
    setError(null);
    resetFormFromSession();
    setFormKey((k) => k + 1);
    setMode('read');
  }

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
        const location = resolveLocationPayload();
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
            exposureSetting: showOutdoorContext ? exposure : exposure,
            locationLabel: location.locationLabel,
            locationLat: location.locationLat,
            locationLng: location.locationLng,
          },
        });
        await queryClient.refetchQueries({
          queryKey: queryKeys.plannedSessionPresentation(session.id),
        });
        setMode('read');
        return;
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
        const location = resolveLocationPayload();
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
          exposureSetting: showOutdoorContext ? exposure : defaultExposureForActivityType(type),
          locationLabel: location.locationLabel,
          locationLat: location.locationLat,
          locationLng: location.locationLng,
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
        <DialogContent className="no-scrollbar max-h-[90vh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle(isEdit, mode, Boolean(session?.activity))}</DialogTitle>
          </DialogHeader>

          {isEdit && mode === 'read' && liveSession && (
            <>
              {liveSession.brickGroupId ? (
                <>
                  <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                    <Layers className="size-3.5 shrink-0" />
                    Cette séance fait partie d&apos;un brick (enchaînement multisport). Tu ne
                    modifies ici que ce sport.
                  </div>
                  <BrickAnalysisPanel brickGroupId={liveSession.brickGroupId} />
                </>
              ) : null}
              <PlannedSessionReadView
                context={contextQuery.data?.context}
                goals={raceGoals}
                session={liveSession}
                onEdit={handleStartEdit}
              />
            </>
          )}

          {(!isEdit || mode === 'edit') && (
            <>
              {isEdit && session?.brickGroupId ? (
                <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <Layers className="size-3.5 shrink-0" />
                  Cette séance fait partie d&apos;un brick (enchaînement multisport). Tu ne modifies
                  ici que ce sport.
                </div>
              ) : null}

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

              <form key={formKey} className="min-w-0 space-y-4" onSubmit={handleSubmit}>
                {createMode === 'single' && (
                  <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="title">Titre</Label>
                      <Input
                        defaultValue={session?.title ?? ''}
                        id="title"
                        name="title"
                        placeholder="Sortie longue Z2"
                      />
                    </div>
                  </div>
                )}

                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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
                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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

                    {showOutdoorContext ? (
                      <div className="border-border/60 bg-muted/20 space-y-3 rounded-lg border p-3">
                        <p className="text-foreground text-sm font-medium">
                          Conditions de la séance
                        </p>
                        <div className="min-w-0 space-y-2">
                          <Label>Lieu d&apos;entraînement</Label>
                          <Select
                            value={exposure}
                            onValueChange={(v) =>
                              setExposure(v as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN')
                            }
                          >
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue>{exposureLabels[exposure]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OUTDOOR">Extérieur</SelectItem>
                              <SelectItem value="INDOOR">Intérieur / home trainer</SelectItem>
                              <SelectItem value="UNKNOWN">À confirmer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {exposure === 'OUTDOOR' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  ['home', 'Domicile (Colombes)'],
                                  ['travel', 'Voyage actif'],
                                  ['custom', 'Autre lieu'],
                                ] as const
                              ).map(([id, label]) => (
                                <button
                                  key={id}
                                  disabled={id === 'travel' && !travelQuery.data?.active}
                                  type="button"
                                  className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    locationSource === id
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted-foreground hover:text-foreground',
                                    id === 'travel' && !travelQuery.data?.active && 'opacity-40',
                                  )}
                                  onClick={() => setLocationSource(id)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {locationSource === 'custom' ? (
                              <LocationPlacePicker value={customPlace} onChange={setCustomPlace} />
                            ) : (
                              <p className="text-muted-foreground text-xs">
                                {locationSource === 'home'
                                  ? (homeQuery.data?.home.label ?? 'Colombes, France')
                                  : travelQuery.data?.active?.locationLabel}
                              </p>
                            )}
                          </div>
                        ) : null}

                        <p className="text-muted-foreground text-xs leading-relaxed">
                          SHARPIT utilise le lieu pour anticiper chaleur, pluie et vent avant la
                          séance — sans afficher la météo brute en premier.
                        </p>
                      </div>
                    ) : null}

                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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
                      Chaque sport de l&apos;enchaînement devient une séance à part (une activité
                      Strava liée, une analyse).
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
                        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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
                        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
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
                    <Button
                      disabled={pending}
                      type="button"
                      variant="outline"
                      onClick={isEdit ? handleCancelEdit : onClose}
                    >
                      Annuler
                    </Button>
                    <Button disabled={pending} type="submit">
                      {submitButtonLabel(pending, isEdit, createMode)}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
