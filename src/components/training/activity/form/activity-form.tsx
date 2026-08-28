'use client';

import type { ActivityFormProps } from '@/components/training/activity/form/activity-form-helpers';
import { ActivityFormFields } from '@/components/training/activity/form/activity-form-fields';
import { useActivityForm } from '@/components/training/activity/form/use-activity-form';

export function ActivityForm(props: ActivityFormProps) {
  const formState = useActivityForm(props);
  return <ActivityFormFields {...formState} />;
}
