'use client';

import { ActivityType } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { queryKeys } from '@/lib/client/keys';
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
import { activityTypeLabels, formatDateTimeLocal } from '@/lib/format';
import { createActivitySchema } from '@/lib/validators/activity';

type ActivityFormValues = z.input<typeof createActivitySchema>;

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

export function ActivityForm({ mode, initialData }: ActivityFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
          load: initialData.load ?? undefined,
          runMetrics: initialData.runMetrics ?? undefined,
          bikeMetrics: initialData.bikeMetrics ?? undefined,
          swimMetrics: initialData.swimMetrics ?? undefined,
          strengthSets: initialData.strengthSets.length
            ? initialData.strengthSets
            : [defaultStrengthSet],
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
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'strengthSets',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const url = mode === 'create' ? '/api/activities' : `/api/activities/${initialData?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json();
      form.setError('root', {
        message: error.error ?? 'Une erreur est survenue',
      });
      return;
    }

    const activity = await response.json();
    await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    router.push(`/training/${activity.id}`);
    router.refresh();
  });

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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              defaultValue={formatDateTimeLocal(
                initialData?.date ? new Date(initialData.date) : new Date(),
              )}
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
              defaultValue={
                initialData?.duration ? Math.round(initialData.duration / 60) : undefined
              }
              onChange={(e) =>
                form.setValue('duration', e.target.value ? Number(e.target.value) * 60 : undefined)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rpe">RPE (1-10)</Label>
            <Input id="rpe" max={10} min={1} type="number" {...form.register('rpe')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="load">Charge (TSS)</Label>
            <Input id="load" step="0.1" type="number" {...form.register('load')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeling">Ressenti</Label>
            <Input id="feeling" {...form.register('feeling')} placeholder="Bien, fatigué..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weather">Météo</Label>
            <Input id="weather" {...form.register('weather')} placeholder="12°C, vent léger" />
          </div>

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
