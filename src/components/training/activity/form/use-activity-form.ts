'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import {
  ACTIVITY_FEELING_OPTIONS,
  type ActivityFormProps,
  type ActivityFormValues,
  formatValidationErrors,
  initialLocationFromData,
  buildActivityFormDefaultValues,
  resolveWatchedDate,
  resolveWatchedDurationSec,
  resolveWatchedRpe,
  sanitizeActivityPayload,
} from '@/components/training/activity/form/activity-form-helpers';
import { useActivityFormEffects } from '@/components/training/activity/form/use-activity-form-effects';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { useActivityMutations } from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import {
  formatActivityWeatherNarrative,
  parseActivityWeather,
} from '@/lib/activity/weather/activity-weather';
import { createActivitySchema } from '@/lib/validators/activity';

export function useActivityForm({ mode, initialData }: ActivityFormProps) {
  const router = useRouter();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const { create, update } = useActivityMutations();
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
    defaultValues: buildActivityFormDefaultValues(initialData),
  });

  const activityType = useWatch({ control: form.control, name: 'type' });
  const activityDate = useWatch({ control: form.control, name: 'date' });
  const durationSec = useWatch({ control: form.control, name: 'duration' });
  const rpe = useWatch({ control: form.control, name: 'rpe' });
  const feeling = useWatch({ control: form.control, name: 'feeling' });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'strengthSets' });

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

  useActivityFormEffects({
    mode,
    form,
    location,
    setLocation,
    locationTouchedRef,
    setWeatherSummary,
    setWeatherLoading,
    resolvedActivityDate,
    resolvedDurationSec,
    activityType,
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (guardDisabled) {
        return;
      }
      const payload = sanitizeActivityPayload(values);
      try {
        if (mode === 'create') {
          const activity = await create.mutateAsync(payload);
          form.reset();
          router.push(`/training/${activity.id}`);
          return;
        }
        const { id } = initialData!;
        update.mutate(
          { id, data: payload },
          {
            onError: (err) => {
              form.setError('root', {
                message: err instanceof Error ? err.message : 'Une erreur est survenue',
              });
            },
          },
        );
        // replace: edit is transient — do not leave it under detail in browser history
        router.replace(`/training/${id}`);
      } catch (err) {
        form.setError('root', {
          message: err instanceof Error ? err.message : 'Une erreur est survenue',
        });
      }
    },
    (errors) => {
      form.setError('root', {
        message: formatValidationErrors(errors as Record<string, unknown>),
      });
    },
  );

  return {
    form,
    mode,
    offline,
    guardDisabled,
    offlineLabel,
    router,
    location,
    setLocation,
    locationTouchedRef,
    weatherSummary,
    weatherLoading,
    activityType,
    resolvedActivityDate,
    resolvedDurationSec,
    resolvedRpe,
    feelingValue,
    feelingOptions,
    isOutdoor,
    fields,
    append,
    remove,
    onSubmit,
  };
}
