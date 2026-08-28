'use client';

import { guardedActionLabel } from '@/hooks/use-offline-guard';
import { Button } from '@/components/ui/button';
import { ActivityFormGeneralCard } from '@/components/training/activity/form/activity-form-general-card';
import { ActivityFormSportCards } from '@/components/training/activity/form/activity-form-sport-cards';
import type { useActivityForm } from '@/components/training/activity/form/use-activity-form';

export function ActivityFormFields(state: ReturnType<typeof useActivityForm>) {
  const { form, mode, offline, guardDisabled, offlineLabel, router, onSubmit } = state;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <ActivityFormGeneralCard state={state} />
      <ActivityFormSportCards state={state} />

      {form.formState.errors.root ? (
        <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
      ) : null}

      <div className="flex gap-3">
        <Button disabled={guardDisabled || form.formState.isSubmitting} type="submit">
          {guardedActionLabel(
            offline,
            offlineLabel,
            mode === 'create' ? 'Enregistrer la séance' : 'Mettre à jour',
            {
              active: form.formState.isSubmitting,
              label: 'Enregistrement…',
            },
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
