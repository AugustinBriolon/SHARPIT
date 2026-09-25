'use client';

import { ActivityType } from '@prisma/client';
import { ActivityFormOutdoorFields } from '@/components/training/activity/form/activity-form-outdoor-fields';
import { ActivityFormSubjectiveFields } from '@/components/training/activity/form/activity-form-subjective-fields';
import { emptyToUndefined } from '@/components/training/activity/form/activity-form-helpers';
import type { useActivityForm } from '@/components/training/activity/form/use-activity-form';
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

export function ActivityFormGeneralCard(
  state: Pick<
    ReturnType<typeof useActivityForm>,
    | 'form'
    | 'activityType'
    | 'resolvedActivityDate'
    | 'resolvedDurationSec'
    | 'resolvedRpe'
    | 'feelingValue'
    | 'feelingOptions'
    | 'isOutdoor'
    | 'location'
    | 'setLocation'
    | 'locationTouchedRef'
    | 'weatherSummary'
    | 'weatherLoading'
  >,
) {
  const {
    form,
    activityType,
    resolvedActivityDate,
    resolvedDurationSec,
    resolvedRpe,
    feelingValue,
    feelingOptions,
    isOutdoor,
    location,
    setLocation,
    locationTouchedRef,
    weatherSummary,
    weatherLoading,
  } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations générales</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="activity-type">Type</Label>
          <Select
            value={activityType}
            onValueChange={(value) => form.setValue('type', value as ActivityType)}
          >
            <SelectTrigger className="w-full" id="activity-type">
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
          <Input
            autoComplete="off"
            id="title"
            {...form.register('title')}
            placeholder="Z2 endurance"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Durée (min)</Label>
          <Input
            id="duration"
            inputMode="decimal"
            type="number"
            value={
              resolvedDurationSec !== null && resolvedDurationSec > 0
                ? Math.round(resolvedDurationSec / 60)
                : ''
            }
            onChange={(e) =>
              form.setValue('duration', e.target.value ? Number(e.target.value) * 60 : undefined)
            }
          />
        </div>

        <ActivityFormSubjectiveFields
          feelingOptions={feelingOptions}
          feelingValue={feelingValue}
          form={form}
          resolvedRpe={resolvedRpe}
        />

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
            <ActivityFormOutdoorFields
              isOutdoor={isOutdoor}
              location={location}
              locationTouchedRef={locationTouchedRef}
              setLocation={setLocation}
              weatherLoading={weatherLoading}
              weatherSummary={weatherSummary}
            />
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} {...form.register('notes')} />
        </div>
      </CardContent>
    </Card>
  );
}
