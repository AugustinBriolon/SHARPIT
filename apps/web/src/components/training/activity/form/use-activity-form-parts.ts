'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
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
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import type { useActivityMutations } from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import {
  formatActivityWeatherNarrative,
  parseActivityWeather,
} from '@/lib/activity/weather/activity-weather';
import { createActivitySchema } from '@/lib/validators/activity';

function useActivityFormLocationState(initialData: ActivityFormProps['initialData']) {
  const [location, setLocation] = useState<LocationPlaceValue>(() =>
    initialLocationFromData(initialData),
  );
  const locationTouchedRef = useRef(Boolean(initialData?.observedLocationLabel));
  const [weatherSummary, setWeatherSummary] = useState<string | null>(() => {
    const parsed = parseActivityWeather(initialData?.weather);
    return parsed ? formatActivityWeatherNarrative(parsed) : null;
  });
  const [weatherLoading, setWeatherLoading] = useState(false);

  return {
    location,
    setLocation,
    locationTouchedRef,
    weatherSummary,
    setWeatherSummary,
    weatherLoading,
    setWeatherLoading,
  };
}

function buildFeelingOptions(feelingValue: string) {
  const options = [...ACTIVITY_FEELING_OPTIONS];
  if (feelingValue && !options.some((option) => option.value === feelingValue)) {
    options.unshift({ value: feelingValue, label: feelingValue });
  }
  return options;
}

function useActivityFormWatchers(form: UseFormReturn<ActivityFormValues>) {
  const activityType = useWatch({ control: form.control, name: 'type' });
  const activityDate = useWatch({ control: form.control, name: 'date' });
  const durationSec = useWatch({ control: form.control, name: 'duration' });
  const rpe = useWatch({ control: form.control, name: 'rpe' });
  const feeling = useWatch({ control: form.control, name: 'feeling' });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'strengthSets' });
  const feelingValue = typeof feeling === 'string' ? feeling : '';
  const feelingOptions = useMemo(() => buildFeelingOptions(feelingValue), [feelingValue]);

  return {
    activityType,
    resolvedActivityDate: resolveWatchedDate(activityDate),
    resolvedDurationSec: resolveWatchedDurationSec(durationSec),
    resolvedRpe: resolveWatchedRpe(rpe),
    feelingValue,
    feelingOptions,
    isOutdoor: sportSupportsOutdoorContext(activityType),
    fields,
    append,
    remove,
  };
}

export function useActivityFormSetup(initialData: ActivityFormProps['initialData']) {
  const locationState = useActivityFormLocationState(initialData);
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: buildActivityFormDefaultValues(initialData),
  });
  const watchers = useActivityFormWatchers(form);

  return {
    form,
    ...locationState,
    ...watchers,
  };
}

function submitCreateActivity({
  payload,
  create,
  router,
  form,
}: {
  payload: ReturnType<typeof sanitizeActivityPayload>;
  create: ReturnType<typeof useActivityMutations>['create'];
  router: ReturnType<typeof useRouter>;
  form: UseFormReturn<ActivityFormValues>;
}) {
  create.mutate(payload, {
    onSuccess: (activity) => {
      router.replace(`/activite/${activity.id}`);
    },
  });
  form.reset();
  // Leave the form Instant — list already has the optimistic row; detail opens when id lands.
  router.replace('/activite');
}

function submitEditActivity({
  id,
  payload,
  update,
  router,
  form,
}: {
  id: string;
  payload: ReturnType<typeof sanitizeActivityPayload>;
  update: ReturnType<typeof useActivityMutations>['update'];
  router: ReturnType<typeof useRouter>;
  form: UseFormReturn<ActivityFormValues>;
}) {
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
  router.replace(`/activite/${id}`);
}

export function buildActivityFormSubmitHandler({
  mode,
  initialData,
  guardDisabled,
  create,
  update,
  router,
  form,
}: {
  mode: ActivityFormProps['mode'];
  initialData: ActivityFormProps['initialData'];
  guardDisabled: boolean;
  create: ReturnType<typeof useActivityMutations>['create'];
  update: ReturnType<typeof useActivityMutations>['update'];
  router: ReturnType<typeof useRouter>;
  form: UseFormReturn<ActivityFormValues>;
}) {
  return form.handleSubmit(
    (values) => {
      if (guardDisabled) {
        return;
      }
      const payload = sanitizeActivityPayload(values);
      if (mode === 'create') {
        submitCreateActivity({ payload, create, router, form });
        return;
      }
      submitEditActivity({ id: initialData!.id, payload, update, router, form });
    },
    (errors) => {
      form.setError('root', {
        message: formatValidationErrors(errors as Record<string, unknown>),
      });
    },
  );
}

export function useActivityFormContext(mode: ActivityFormProps['mode']) {
  const router = useRouter();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  return { router, offline, guardDisabled, offlineLabel, mode };
}
