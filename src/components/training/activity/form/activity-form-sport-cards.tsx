'use client';

import { ActivityType } from '@prisma/client';
import { ActivityFormField } from '@/components/training/activity/form/activity-form-field';
import { defaultStrengthSet } from '@/components/training/activity/form/activity-form-helpers';
import type { useActivityForm } from '@/components/training/activity/form/use-activity-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ActivityFormSportCards(
  state: Pick<
    ReturnType<typeof useActivityForm>,
    'activityType' | 'form' | 'fields' | 'append' | 'remove'
  >,
) {
  const { activityType, form, fields, append, remove } = state;

  return (
    <>
      {activityType === ActivityType.RUN && (
        <Card>
          <CardHeader>
            <CardTitle>Course</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <ActivityFormField
              factor={1000}
              form={form}
              label="Distance (km)"
              name="runMetrics.distanceM"
            />
            <ActivityFormField form={form} label="Dénivelé (m)" name="runMetrics.elevationM" />
            <ActivityFormField form={form} label="Allure (sec/km)" name="runMetrics.paceSecPerKm" />
            <ActivityFormField form={form} label="FC moy." name="runMetrics.avgHr" />
            <ActivityFormField form={form} label="Puissance" name="runMetrics.avgPower" />
            <ActivityFormField form={form} label="Cadence" name="runMetrics.cadence" />
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
            <ActivityFormField form={form} label="FTP %" name="bikeMetrics.ftpPercent" />
            <ActivityFormField form={form} label="NP (W)" name="bikeMetrics.normalizedPower" />
            <ActivityFormField form={form} label="IF" name="bikeMetrics.intensityFactor" />
            <ActivityFormField form={form} label="TSS" name="bikeMetrics.tss" />
            <ActivityFormField form={form} label="Cadence" name="bikeMetrics.avgCadence" />
            <ActivityFormField form={form} label="Puissance moy." name="bikeMetrics.avgPower" />
            <ActivityFormField form={form} label="Dénivelé (m)" name="bikeMetrics.elevationM" />
            <ActivityFormField form={form} label="Calories" name="bikeMetrics.calories" />
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
            <ActivityFormField form={form} label="Distance (m)" name="swimMetrics.distanceM" />
            <ActivityFormField form={form} label="Séries" name="swimMetrics.sets" />
            <ActivityFormField
              form={form}
              label="CSS (sec/100m)"
              name="swimMetrics.cssSecPer100m"
            />
            <ActivityFormField
              form={form}
              label="Allure moy. (sec/100m)"
              name="swimMetrics.avgPaceSecPer100m"
            />
            <ActivityFormField form={form} label="SWOLF" name="swimMetrics.swolf" />
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
    </>
  );
}
