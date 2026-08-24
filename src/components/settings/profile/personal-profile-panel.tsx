'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { ProfileFormSection } from '@/components/settings/profile/profile-form-section';
import {
  clockToInput,
  NUMERIC_INPUT_CLASS,
  parseClockInput,
} from '@/components/settings/profile/profile-input-format';
import { commitProfileSave, saveProfilePatch } from '@/components/settings/profile/profile-save';
import { changedProfileFields } from '@/lib/profile/profile-patch';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAthleteProfile } from '@/hooks/use-data';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { athleteAgeYears, birthDateToInput } from '@/lib/profile/athlete-profile-utils';
import {
  mapAthleteProfileToFormData,
  shouldHydrateProfileForm,
} from '@/lib/profile/map-athlete-profile';

type FieldKey = 'heightCm' | 'sleepHours' | 'sleepBedtime';

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

  const [heightCm, setHeightCm] = useState(resolvedInitial?.heightCm?.toString() ?? '');
  const [birthDate, setBirthDate] = useState(() =>
    birthDateToInput(resolvedInitial?.birthDate ?? null),
  );
  const [sleepHours, setSleepHours] = useState(() =>
    resolvedInitial?.sleepTargetMinutes != null
      ? String(resolvedInitial.sleepTargetMinutes / 60)
      : '',
  );
  const [sleepBedtime, setSleepBedtime] = useState(() =>
    clockToInput(resolvedInitial?.sleepBedtimeTargetMin ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  // The saved / failed banner is feedback on an action just taken, so it must
  // not still be here next time the athlete opens this panel.
  useResetWhenHidden(() => {
    setMessage(null);
    setError(null);
    setFieldErrors({});
  });

  // Re-hydrate when a real snapshot arrives — never wipe on null (failed RSC load).
  useEffect(() => {
    if (!shouldHydrateProfileForm(resolvedInitial)) return;
    setHeightCm(resolvedInitial.heightCm?.toString() ?? '');
    setBirthDate(birthDateToInput(resolvedInitial.birthDate ?? null));
    setSleepHours(
      resolvedInitial.sleepTargetMinutes != null
        ? String(resolvedInitial.sleepTargetMinutes / 60)
        : '',
    );
    setSleepBedtime(clockToInput(resolvedInitial.sleepBedtimeTargetMin ?? null));
    setFieldErrors({});
  }, [
    resolvedInitial,
    resolvedInitial?.heightCm,
    resolvedInitial?.birthDate,
    resolvedInitial?.sleepTargetMinutes,
    resolvedInitial?.sleepBedtimeTargetMin,
  ]);

  const baseline = useMemo(
    () => ({
      heightCm: resolvedInitial?.heightCm?.toString() ?? '',
      birthDate: birthDateToInput(resolvedInitial?.birthDate ?? null),
      sleepHours:
        resolvedInitial?.sleepTargetMinutes != null
          ? String(resolvedInitial.sleepTargetMinutes / 60)
          : '',
      sleepBedtime: clockToInput(resolvedInitial?.sleepBedtimeTargetMin ?? null),
    }),
    [resolvedInitial],
  );

  const dirty =
    heightCm !== baseline.heightCm ||
    birthDate !== baseline.birthDate ||
    sleepHours !== baseline.sleepHours ||
    sleepBedtime !== baseline.sleepBedtime;

  function validateFields(): Partial<Record<FieldKey, string>> {
    const next: Partial<Record<FieldKey, string>> = {};
    if (heightCm.trim()) {
      const h = Number(heightCm);
      if (!Number.isFinite(h) || h < 100 || h > 250) {
        next.heightCm = 'Taille invalide (entre 100 et 250 cm).';
      }
    }
    if (sleepHours.trim()) {
      const sleepMinutes = Math.round(Number(sleepHours) * 60);
      if (!Number.isFinite(sleepMinutes) || sleepMinutes < 240 || sleepMinutes > 720) {
        next.sleepHours = 'Objectif sommeil invalide (entre 4 h et 12 h).';
      }
    }
    if (sleepBedtime.trim() && parseClockInput(sleepBedtime) == null) {
      next.sleepBedtime = 'Heure de coucher invalide (format HH:mm).';
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardDisabled) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const nextErrors = validateFields();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = (['heightCm', 'sleepHours', 'sleepBedtime'] as const).find(
        (k) => nextErrors[k],
      );
      if (first) document.getElementById(first)?.focus();
      setSaving(false);
      return;
    }

    try {
      const sleepMinutes = sleepHours.trim() ? Math.round(Number(sleepHours) * 60) : null;
      const bedtimeMin = parseClockInput(sleepBedtime);

      /* Only the fields that moved. Sending all four — `null` for each empty
         one — is what wiped this profile: a load that failed renders empty
         fields, and editing one of them then cleared the other three. */
      const patch = changedProfileFields(
        {
          heightCm: resolvedInitial?.heightCm ?? null,
          birthDate: resolvedInitial?.birthDate ?? null,
          sleepTargetMinutes: resolvedInitial?.sleepTargetMinutes ?? null,
          sleepBedtimeTargetMin: resolvedInitial?.sleepBedtimeTargetMin ?? null,
        },
        {
          heightCm: heightCm.trim() ? Number(heightCm) : null,
          birthDate: birthDate.trim() || null,
          sleepTargetMinutes: sleepMinutes,
          sleepBedtimeTargetMin: bedtimeMin,
        },
      );

      if (Object.keys(patch).length === 0) {
        setMessage('Rien à enregistrer.');
        setSaving(false);
        return;
      }

      const previousProfile = saveProfilePatch(queryClient, patch);

      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await commitProfileSave(queryClient, router, res, previousProfile);
      setMessage('Profil enregistré.');
      toast.success('Profil enregistré');
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSaving(false);
    }
  }

  const age = athleteAgeYears(birthDate || null);
  const showLoadWarning = Boolean(loadError) || (initial == null && remoteProfile.isError);

  return (
    <form className="space-y-3" noValidate onSubmit={handleSubmit}>
      {showLoadWarning ? (
        <p className="text-destructive text-sm" role="alert">
          {loadError ??
            'Chargement du profil impossible. Les champs vides ne reflètent pas forcément la base: réessaie avant d’enregistrer.'}
        </p>
      ) : null}
      <ProfileFormSection title="Identité & rythme de vie" compact>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="heightCm">Taille (cm)</Label>
            <Input
              aria-describedby={fieldErrors.heightCm ? heightErrorId : undefined}
              aria-invalid={fieldErrors.heightCm ? true : undefined}
              className={NUMERIC_INPUT_CLASS}
              id="heightCm"
              max={250}
              min={100}
              placeholder="178"
              type="number"
              value={heightCm}
              onChange={(e) => {
                setHeightCm(e.target.value);
                setFieldErrors((prev) => ({ ...prev, heightCm: undefined }));
              }}
            />
            {fieldErrors.heightCm ? (
              <p className="text-destructive text-xs" id={heightErrorId}>
                {fieldErrors.heightCm}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Date de naissance</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            {age != null ? (
              <p className="text-muted-foreground text-xs tabular-nums">{age} ans</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleepHours">Objectif sommeil (h)</Label>
            <Input
              aria-describedby={fieldErrors.sleepHours ? sleepErrorId : 'sleepHours-hint'}
              aria-invalid={fieldErrors.sleepHours ? true : undefined}
              className={NUMERIC_INPUT_CLASS}
              id="sleepHours"
              max={12}
              min={4}
              placeholder="8"
              step={0.25}
              type="number"
              value={sleepHours}
              onChange={(e) => {
                setSleepHours(e.target.value);
                setFieldErrors((prev) => ({ ...prev, sleepHours: undefined }));
              }}
            />
            {fieldErrors.sleepHours ? (
              <p className="text-destructive text-xs" id={sleepErrorId}>
                {fieldErrors.sleepHours}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs" id="sleepHours-hint">
                Entre 4 et 12 heures.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleepBedtime">Coucher visé (HH:mm)</Label>
            <Input
              aria-describedby={fieldErrors.sleepBedtime ? bedtimeErrorId : undefined}
              aria-invalid={fieldErrors.sleepBedtime ? true : undefined}
              className={NUMERIC_INPUT_CLASS}
              id="sleepBedtime"
              placeholder="22:30"
              value={sleepBedtime}
              onChange={(e) => {
                setSleepBedtime(e.target.value);
                setFieldErrors((prev) => ({ ...prev, sleepBedtime: undefined }));
              }}
            />
            {fieldErrors.sleepBedtime ? (
              <p className="text-destructive text-xs" id={bedtimeErrorId}>
                {fieldErrors.sleepBedtime}
              </p>
            ) : null}
          </div>
        </div>
      </ProfileFormSection>

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
      {/* A diff needs a baseline. Saving against one that never loaded is how
          the fields were emptied in the first place. */}
      <Button disabled={guardDisabled || saving || !dirty || showLoadWarning} type="submit">
        {guardedActionLabel(offline, offlineLabel, 'Enregistrer', {
          active: saving,
          label: 'Enregistrement…',
        })}
      </Button>
    </form>
  );
}
