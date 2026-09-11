'use client';

import {
  buildActivityFormSubmitHandler,
  useActivityFormContext,
  useActivityFormSetup,
} from '@/components/training/activity/form/use-activity-form-parts';
import { useActivityFormEffects } from '@/components/training/activity/form/use-activity-form-effects';
import type { ActivityFormProps } from '@/components/training/activity/form/activity-form-helpers';
import { useActivityMutations } from '@/hooks/use-data';

export function useActivityForm({ mode, initialData }: ActivityFormProps) {
  const context = useActivityFormContext(mode);
  const { create, update } = useActivityMutations();
  const setup = useActivityFormSetup(initialData);

  useActivityFormEffects({
    mode,
    form: setup.form,
    location: setup.location,
    setLocation: setup.setLocation,
    locationTouchedRef: setup.locationTouchedRef,
    setWeatherSummary: setup.setWeatherSummary,
    setWeatherLoading: setup.setWeatherLoading,
    resolvedActivityDate: setup.resolvedActivityDate,
    resolvedDurationSec: setup.resolvedDurationSec,
    activityType: setup.activityType,
  });

  const onSubmit = buildActivityFormSubmitHandler({
    mode,
    initialData,
    guardDisabled: context.guardDisabled,
    create,
    update,
    router: context.router,
    form: setup.form,
  });

  return {
    ...context,
    ...setup,
    onSubmit,
  };
}
