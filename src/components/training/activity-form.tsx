'use client';

import { ActivityType } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  LocationPlacePicker,
  type LocationPlaceValue,
} from '@/components/planning/location-place-picker';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { queryKeys } from '@/lib/query/keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  formatActivityWeatherNarrative,
  parseActivityWeather,
} from '@/lib/activity/activity-weather';
import { activityTypeLabels, formatDateTimeLocal } from '@/lib/format';
import { createActivitySchema } from '@/lib/validators/activity';

type ActivityFormValues = z.input<typeof createActivitySchema>;

function strengthSetsForForm(initialData: ActivityWithRelations) {
  if (initialData.type !== ActivityType.STRENGTH) return [];
  return initialData.strengthSets.length ? initialData.strengthSets : [defaultStrengthSet];
}

function resolveWatchedDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

function resolveWatchedDurationSec(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  return value;
}

function sanitizeActivityPayload(values: ActivityFormValues): ActivityFormValues {
  const payload: ActivityFormValues = {
    ...values,
    title: values.title || undefined,
    feeling: values.feeling || undefined,
    notes: values.notes || undefined,
    weather: values.weather || undefined,
    observedLocationLabel: values.observedLocationLabel || undefined,
    observedLocationLat: emptyToUndefined(values.observedLocationLat) as number | undefined,
    observedLocationLng: emptyToUndefined(values.observedLocationLng) as number | undefined,
    duration: emptyToUndefined(values.duration) as number | undefined,
    rpe: emptyToUndefined(values.rpe) as number | undefined,
    load: emptyToUndefined(values.load) as number | undefined,
  };

  if (!sportSupportsOutdoorContext(payload.type)) {
    delete payload.observedLocationLabel;
    delete payload.observedLocationLat;
    delete payload.observedLocationLng;
    delete payload.weather;
  }

  if (payload.type !== ActivityType.STRENGTH) {
    delete payload.strengthSets;
  }

  return payload;
}

function initialLocationFromData(data?: ActivityWithRelations): LocationPlaceValue {
  if (
    data?.observedLocationLat != null &&
    data.observedLocationLng != null &&
    data.observedLocationLabel
  ) {
    return {
      label: data.observedLocationLabel,
      latitude: data.observedLocationLat,
      longitude: data.observedLocationLng,
    };
  }
  return null;
}

function formatValidationErrors(errors: Record<string, unknown>): string {
  const messages: string[] = [];

  function walk(node: unknown, path: string) {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.message === 'string') {
      messages.push(path ? `${path} : ${record.message}` : record.message);
    }
    for (const [key, value] of Object.entries(record)) {
      if (key === 'message' || key === 'type' || key === 'ref') continue;
      walk(value, path ? `${path}.${key}` : key);
    }
  }

  walk(errors, '');
  return messages[0] ?? 'Vérifie les champs du formulaire.';
}

type ActivityWithRelations = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  rpe: number | null;
  feeling: string | null;
  notes: string | null;
  weather: string | null;
  load: number | null;
  observedLocationLabel: string | null;
  observedLocationLat: number | null;
  observedLocationLng: number | null;
  runMetrics: Record<string, unknown> | null;
  bikeMetrics: Record<string, unknown> | null;
  swimMetrics: Record<string, unknown> | null;
  strengthSets: Array<Record<string, unknown>>;
};

interface ActivityFormProps {
  mode: 'create' | 'edit';
  initialData?: ActivityWithRelations;
}

const defaultStrengthSet = {
  exercise: '',
  sets: 3,
  reps: 8,
  weightKg: undefined,
  rpe: undefined,
  restSec: 90,
  videoUrl: '',
  notes: '',
};

const ACTIVITY_FEELING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Très bien', label: 'Très bien' },
  { value: 'Bien', label: 'Bien' },
  { value: 'Correct', label: 'Correct' },
  { value: 'Mal', label: 'Mal' },
  { value: 'Très mal', label: 'Très mal' },
];

function resolveWatchedRpe(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function ActivityForm({ mode, initialData }: ActivityFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<LocationPlaceValue>(() =>
    initialLocationFromData(initialData),
  );
  const locationTouchedRef = useRef(Boolean(initialData?.observedLocationLabel));
  const [weatherSummary, setWeatherSummary] = useState<string | null>(() => {
    const parsed = parseActivityWeather(initialData?.weather);
    return parsed ? formatActivityWeatherNarrative(parsed) : null;
  });
  const [weatherLoading, setWeatherLoading] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          date: new Date(initialData.date),
          title: initialData.title ?? '',
          duration: initialData.duration ?? undefined,
          rpe: initialData.rpe ?? undefined,
          feeling: initialData.feeling ?? '',
          notes: initialData.notes ?? '',
          weather: initialData.weather ?? '',
          observedLocationLabel: initialData.observedLocationLabel ?? '',
          observedLocationLat: initialData.observedLocationLat ?? undefined,
          observedLocationLng: initialData.observedLocationLng ?? undefined,
          load: initialData.load ?? undefined,
          runMetrics: initialData.runMetrics ?? undefined,
          bikeMetrics: initialData.bikeMetrics ?? undefined,
          swimMetrics: initialData.swimMetrics ?? undefined,
          strengthSets: strengthSetsForForm(initialData),
        }
      : {
          type: ActivityType.RUN,
          date: new Date(),
          strengthSets: [defaultStrengthSet],
        },
  });

  const activityType = useWatch({
    control: form.control,
    name: 'type',
  });
  const activityDate = useWatch({
    control: form.control,
    name: 'date',
  });
  const durationSec = useWatch({
    control: form.control,
    name: 'duration',
  });
  const rpe = useWatch({
    control: form.control,
    name: 'rpe',
  });
  const feeling = useWatch({
    control: form.control,
    name: 'feeling',
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'strengthSets',
  });

  const resolvedActivityDate = resolveWatchedDate(activityDate);
  const resolvedDurationSec = resolveWatchedDurationSec(durationSec);
  const resolvedRpe = resolveWatchedRpe(rpe);
  const feelingValue = typeof feeling === 'string' ? feeling : '';
  const feelingOptions = useMemo(() => {
    const options = [...ACTIVITY_FEELING_OPTIONS];
    if (feelingValue && !options.some((option) => option.value === feelingValue)) {
      options.unshift({ value: feelingValue, label: feelingValue });
    }
    return options;
  }, [feelingValue]);

  const isOutdoor = sportSupportsOutdoorContext(activityType);

  useEffect(() => {
    if (mode !== 'create' || locationTouchedRef.current) return;
    const dateIso = resolvedActivityDate.toISOString();
    void fetch(`/api/geocoding/home?date=${encodeURIComponent(dateIso)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            home?: { label: string; latitude: number; longitude: number };
          } | null,
        ) => {
          if (data?.home) {
            setLocation({
              label: data.home.label,
              latitude: data.home.latitude,
              longitude: data.home.longitude,
            });
          }
        },
      )
      .catch(() => undefined);
  }, [mode, resolvedActivityDate]);

  useEffect(() => {
    if (!location) {
      form.setValue('observedLocationLabel', '');
      form.setValue('observedLocationLat', undefined);
      form.setValue('observedLocationLng', undefined);
      form.setValue('weather', '');
      setWeatherSummary(null);
      return;
    }

    form.setValue('observedLocationLabel', location.label);
    form.setValue('observedLocationLat', location.latitude);
    form.setValue('observedLocationLng', location.longitude);
  }, [form, location]);

  useEffect(() => {
    if (!isOutdoor || !location) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        setWeatherLoading(true);
        try {
          const response = await fetch('/api/activities/weather-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: location.latitude,
              longitude: location.longitude,
              label: location.label,
              date: resolvedActivityDate,
              durationSec: resolvedDurationSec,
            }),
            signal: controller.signal,
          });
          if (!response.ok) return;
          const data = (await response.json()) as {
            weather?: string | null;
            summary?: string | null;
          };
          if (data.weather) {
            form.setValue('weather', data.weather);
          }
          setWeatherSummary(data.summary ?? null);
        } catch {
          // best-effort
        } finally {
          if (!controller.signal.aborted) setWeatherLoading(false);
        }
      })();
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isOutdoor, location, resolvedActivityDate, resolvedDurationSec, form]);

  function renderWeatherHint() {
    if (weatherLoading) {
      return (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Récupération de la météo…
        </>
      );
    }
    if (weatherSummary) {
      return <span>Météo estimée : {weatherSummary}</span>;
    }
    if (location) {
      return <span>La météo sera calculée à partir du lieu et de l&apos;horaire.</span>;
    }
    return null;
  }

  const onSubmit = form.handleSubmit(
    async (values) => {
      const payload = sanitizeActivityPayload(values);
      const url = mode === 'create' ? '/api/activities' : `/api/activities/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        form.setError('root', {
          message: error.error ?? 'Une erreur est survenue',
        });
        return;
      }

      const activity = await response.json();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.records }),
      ]);
      router.push(`/training/${activity.id}`);
      router.refresh();
    },
    (errors) => {
      form.setError('root', {
        message: formatValidationErrors(errors as Record<string, unknown>),
      });
    },
  );

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={activityType}
              onValueChange={(value) => form.setValue('type', value as ActivityType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un sport" />
              </SelectTrigger>
              <SelectContent className="w-max max-w-[var(--available-width)] min-w-[var(--anchor-width)]">
                {Object.values(ActivityType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {activityTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formatDateTimeLocal(resolvedActivityDate)}
              onChange={(e) => form.setValue('date', new Date(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" {...form.register('title')} placeholder="Z2 endurance" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée (min)</Label>
            <Input
              id="duration"
              type="number"
              value={
                resolvedDurationSec != null && resolvedDurationSec > 0
                  ? Math.round(resolvedDurationSec / 60)
                  : ''
              }
              onChange={(e) =>
                form.setValue('duration', e.target.value ? Number(e.target.value) * 60 : undefined)
              }
            />
          </div>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="rpe">RPE (1-10)</Label>
                <span className="text-muted-foreground font-mono text-sm tabular-nums">
                  {resolvedRpe ?? '—'}
                </span>
              </div>
              <input
                className="accent-primary h-2 w-full cursor-pointer"
                id="rpe"
                max={10}
                min={1}
                step={1}
                type="range"
                value={resolvedRpe ?? 5}
                onChange={(e) => form.setValue('rpe', Number(e.target.value))}
              />
              <div className="text-muted-foreground flex justify-between text-[10px]">
                <span>1 · Facile</span>
                <span>10 · Maximal</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ressenti</Label>
              <Select
                value={feelingValue || '__none__'}
                onValueChange={(value) =>
                  form.setValue('feeling', value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Non renseigné">
                    {feelingValue
                      ? (feelingOptions.find((option) => option.value === feelingValue)?.label ??
                        feelingValue)
                      : 'Non renseigné'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-max max-w-[var(--available-width)] min-w-[var(--anchor-width)]">
                  <SelectItem value="__none__">Non renseigné</SelectItem>
                  {feelingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="load">Charge (TSS)</Label>
              <Input
                id="load"
                step="0.1"
                type="number"
                {...form.register('load', { setValueAs: (value) => emptyToUndefined(value) })}
              />
            </div>

            {isOutdoor ? (
              <div className="space-y-2">
                <Label>Lieu de la séance</Label>
                <LocationPlacePicker
                  placeholder="Rechercher une ville ou un lieu…"
                  value={location}
                  onChange={(next) => {
                    locationTouchedRef.current = true;
                    setLocation(next);
                  }}
                />
              </div>
            ) : null}
          </div>

          {isOutdoor ? (
            <div className="text-muted-foreground flex min-h-5 items-center gap-2 text-xs md:col-span-2">
              {renderWeatherHint()}
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>

      {activityType === ActivityType.RUN && (
        <Card>
          <CardHeader>
            <CardTitle>Course</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field factor={1000} form={form} label="Distance (km)" name="runMetrics.distanceM" />
            <Field form={form} label="Dénivelé (m)" name="runMetrics.elevationM" />
            <Field form={form} label="Allure (sec/km)" name="runMetrics.paceSecPerKm" />
            <Field form={form} label="FC moy." name="runMetrics.avgHr" />
            <Field form={form} label="Puissance" name="runMetrics.avgPower" />
            <Field form={form} label="Cadence" name="runMetrics.cadence" />
            <div className="space-y-2 md:col-span-2">
              <Label>Chaussures</Label>
              <Input {...form.register('runMetrics.shoes')} />
            </div>
          </CardContent>
        </Card>
      )}

      {activityType === ActivityType.BIKE && (
        <Card>
          <CardHeader>
            <CardTitle>Vélo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field form={form} label="FTP %" name="bikeMetrics.ftpPercent" />
            <Field form={form} label="NP (W)" name="bikeMetrics.normalizedPower" />
            <Field form={form} label="IF" name="bikeMetrics.intensityFactor" />
            <Field form={form} label="TSS" name="bikeMetrics.tss" />
            <Field form={form} label="Cadence" name="bikeMetrics.avgCadence" />
            <Field form={form} label="Puissance moy." name="bikeMetrics.avgPower" />
            <Field form={form} label="Dénivelé (m)" name="bikeMetrics.elevationM" />
            <Field form={form} label="Calories" name="bikeMetrics.calories" />
            <div className="space-y-2 md:col-span-2">
              <Label>Vélo</Label>
              <Input {...form.register('bikeMetrics.bikeName')} />
            </div>
          </CardContent>
        </Card>
      )}

      {activityType === ActivityType.SWIM && (
        <Card>
          <CardHeader>
            <CardTitle>Natation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field form={form} label="Distance (m)" name="swimMetrics.distanceM" />
            <Field form={form} label="Séries" name="swimMetrics.sets" />
            <Field form={form} label="CSS (sec/100m)" name="swimMetrics.cssSecPer100m" />
            <Field
              form={form}
              label="Allure moy. (sec/100m)"
              name="swimMetrics.avgPaceSecPer100m"
            />
            <Field form={form} label="SWOLF" name="swimMetrics.swolf" />
            <div className="space-y-2 md:col-span-2">
              <Label>Drills</Label>
              <Input {...form.register('swimMetrics.drills')} />
            </div>
          </CardContent>
        </Card>
      )}

      {activityType === ActivityType.STRENGTH && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Musculation</CardTitle>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => append(defaultStrengthSet)}
            >
              Ajouter exercice
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border-border/60 grid gap-3 rounded-lg border p-4 md:grid-cols-4"
              >
                <div className="space-y-2 md:col-span-2">
                  <Label>Exercice</Label>
                  <Input {...form.register(`strengthSets.${index}.exercise`)} />
                </div>
                <div className="space-y-2">
                  <Label>Séries</Label>
                  <Input type="number" {...form.register(`strengthSets.${index}.sets`)} />
                </div>
                <div className="space-y-2">
                  <Label>Reps</Label>
                  <Input type="number" {...form.register(`strengthSets.${index}.reps`)} />
                </div>
                <div className="space-y-2">
                  <Label>Poids (kg)</Label>
                  <Input
                    step="0.5"
                    type="number"
                    {...form.register(`strengthSets.${index}.weightKg`)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RPE</Label>
                  <Input
                    max={10}
                    min={1}
                    type="number"
                    {...form.register(`strengthSets.${index}.rpe`)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Repos (sec)</Label>
                  <Input type="number" {...form.register(`strengthSets.${index}.restSec`)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input {...form.register(`strengthSets.${index}.notes`)} />
                </div>
                {fields.length > 1 && (
                  <div className="flex items-end md:col-span-4">
                    <Button size="sm" type="button" variant="ghost" onClick={() => remove(index)}>
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {form.formState.errors.root && (
        <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
      )}

      <div className="flex gap-3">
        <Button disabled={form.formState.isSubmitting} type="submit">
          {mode === 'create' ? 'Enregistrer la séance' : 'Mettre à jour'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  form,
  factor,
}: {
  label: string;
  name: string;
  form: ReturnType<typeof useForm<ActivityFormValues>>;
  factor?: number;
}) {
  const parts = name.split('.');
  const fieldName = parts[parts.length - 1];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        name={fieldName}
        step="any"
        type="number"
        defaultValue={
          parts.length === 2
            ? (() => {
                const [group, key] = parts;
                const groupValue = form.getValues(group as keyof ActivityFormValues) as
                  Record<string, number> | undefined;
                const val = groupValue?.[key];
                if (val === undefined || val === null) return undefined;
                return factor ? val / factor : val;
              })()
            : undefined
        }
        onChange={(e) => {
          const raw = e.target.value;
          const value = raw ? Number(raw) : undefined;
          const finalValue = value !== undefined && factor ? value * factor : value;

          if (parts.length === 2) {
            const [group, key] = parts as [string, string];
            const current = (form.getValues(group as keyof ActivityFormValues) ?? {}) as Record<
              string,
              unknown
            >;
            form.setValue(
              group as keyof ActivityFormValues,
              {
                ...current,
                [key]: finalValue,
              } as ActivityFormValues[keyof ActivityFormValues],
            );
          } else {
            form.setValue(name as keyof ActivityFormValues, finalValue as never);
          }
        }}
      />
    </div>
  );
}
