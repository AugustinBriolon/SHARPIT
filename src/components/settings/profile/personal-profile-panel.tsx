'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { ProfileFormSection } from '@/components/settings/profile/profile-form-section';
import { PersonalProfileFields } from '@/components/settings/profile/personal-profile-fields';
import {
  firstPersonalProfileFieldError,
  isPersonalProfileDirty,
  personalProfileBaseline,
  submitPersonalProfile,
  validatePersonalProfileFields,
  type PersonalFieldKey,
  type PersonalProfileFormState,
} from '@/components/settings/profile/personal-profile-helpers';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useAthleteProfile } from '@/hooks/use-data';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import {
  mapAthleteProfileToFormData,
  shouldHydrateProfileForm,
} from '@/lib/profile/map-athlete-profile';

function usePersonalProfileForm(resolvedInitial: ProfileData | null | undefined) {
  const baseline = useMemo(() => personalProfileBaseline(resolvedInitial), [resolvedInitial]);
  const [state, setState] = useState<PersonalProfileFormState>(baseline);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PersonalFieldKey, string>>>({});

  useEffect(() => {
    if (!shouldHydrateProfileForm(resolvedInitial)) {
      return;
    }
    setState(personalProfileBaseline(resolvedInitial));
    setFieldErrors({});
  }, [resolvedInitial]);

  const dirty = isPersonalProfileDirty(state, baseline);

  const clearFieldError = (key: PersonalFieldKey) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const updateField = (key: keyof PersonalProfileFormState, value: string) => {
    setState((prev) => ({ ...prev, [key]: value }));
    if (key !== 'birthDate') {
      clearFieldError(key as PersonalFieldKey);
    }
  };

  return { state, fieldErrors, dirty, setFieldErrors, updateField };
}

function PersonalProfileFeedback({
  showLoadWarning,
  loadError,
  message,
  error,
  guardDisabled,
  saving,
  dirty,
  offline,
  offlineLabel,
}: {
  showLoadWarning: boolean;
  loadError: string | null;
  message: string | null;
  error: string | null;
  guardDisabled: boolean;
  saving: boolean;
  dirty: boolean;
  offline: boolean;
  offlineLabel: string;
}) {
  return (
    <>
      {showLoadWarning ? (
        <p className="text-destructive text-sm" role="alert">
          {loadError ??
            'Chargement du profil impossible. Les champs vides ne reflètent pas forcément la base: réessaie avant d’enregistrer.'}
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-primary text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button disabled={guardDisabled || saving || !dirty || showLoadWarning} type="submit">
        {guardedActionLabel(offline, offlineLabel, 'Enregistrer', {
          active: saving,
          label: 'Enregistrement…',
        })}
      </Button>
    </>
  );
}

export function PersonalProfilePanel({
  initial,
  loadError = null,
}: {
  initial: ProfileData | null;
  loadError?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remoteProfile = useAthleteProfile();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const resolvedInitial = initial ?? mapAthleteProfileToFormData(remoteProfile.data);
  const heightErrorId = useId();
  const sleepErrorId = useId();
  const bedtimeErrorId = useId();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state, fieldErrors, dirty, setFieldErrors, updateField } =
    usePersonalProfileForm(resolvedInitial);

  useResetWhenHidden(() => {
    setMessage(null);
    setError(null);
    setFieldErrors({});
  });

  const showLoadWarning = Boolean(loadError) || (initial === null && remoteProfile.isError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardDisabled) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const nextErrors = validatePersonalProfileFields(state);
    setFieldErrors(nextErrors);
    const firstError = firstPersonalProfileFieldError(nextErrors);
    if (firstError) {
      document.getElementById(firstError)?.focus();
      setSaving(false);
      return;
    }

    try {
      const result = await submitPersonalProfile({
        state,
        resolvedInitial,
        queryClient,
        router,
      });
      if (result.kind === 'noop') {
        setMessage('Rien à enregistrer.');
      } else {
        setMessage('Profil enregistré.');
        toast.success('Profil enregistré');
      }
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" noValidate onSubmit={handleSubmit}>
      <ProfileFormSection title="Identité & rythme de vie" compact>
        <PersonalProfileFields
          bedtimeErrorId={bedtimeErrorId}
          fieldErrors={fieldErrors}
          heightErrorId={heightErrorId}
          sleepErrorId={sleepErrorId}
          state={state}
          onBirthDateChange={(value) => updateField('birthDate', value)}
          onHeightChange={(value) => updateField('heightCm', value)}
          onSleepBedtimeChange={(value) => updateField('sleepBedtime', value)}
          onSleepHoursChange={(value) => updateField('sleepHours', value)}
        />
      </ProfileFormSection>
      <PersonalProfileFeedback
        dirty={dirty}
        error={error}
        guardDisabled={guardDisabled}
        loadError={loadError}
        message={message}
        offline={offline}
        offlineLabel={offlineLabel}
        saving={saving}
        showLoadWarning={showLoadWarning}
      />
    </form>
  );
}
