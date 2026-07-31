'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProfileFormSection } from '@/components/settings/profile/profile-form-section';
import {
  clockToInput,
  NUMERIC_INPUT_CLASS,
  parseClockInput,
} from '@/components/settings/profile/profile-input-format';
import { commitProfileSave, saveProfilePatch } from '@/components/settings/profile/profile-save';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAthleteProfile } from '@/hooks/use-data';
import { athleteAgeYears, birthDateToInput } from '@/lib/profile/athlete-profile-utils';
import {
  mapAthleteProfileToFormData,
  shouldHydrateProfileForm,
} from '@/lib/profile/map-athlete-profile';

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
  const resolvedInitial = initial ?? mapAthleteProfileToFormData(remoteProfile.data);

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
  }, [
    resolvedInitial,
    resolvedInitial?.heightCm,
    resolvedInitial?.birthDate,
    resolvedInitial?.sleepTargetMinutes,
    resolvedInitial?.sleepBedtimeTargetMin,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const sleepMinutes = sleepHours.trim() ? Math.round(Number(sleepHours) * 60) : null;
      if (
        sleepMinutes != null &&
        (!Number.isFinite(sleepMinutes) || sleepMinutes < 240 || sleepMinutes > 720)
      ) {
        throw new Error('Objectif sommeil invalide (entre 4 h et 12 h).');
      }
      const bedtimeMin = parseClockInput(sleepBedtime);
      if (sleepBedtime.trim() && bedtimeMin == null) {
        throw new Error('Heure de coucher invalide (format HH:mm).');
      }

      if (heightCm.trim()) {
        const h = Number(heightCm);
        if (!Number.isFinite(h) || h < 100 || h > 250) {
          throw new Error('Taille invalide (entre 100 et 250 cm).');
        }
      }

      const patch = {
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        birthDate: birthDate.trim() || null,
        sleepTargetMinutes: sleepMinutes,
        sleepBedtimeTargetMin: bedtimeMin,
      };

      const previousProfile = saveProfilePatch(queryClient, patch);

      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await commitProfileSave(queryClient, router, res, previousProfile);
      setMessage('Profil enregistré.');
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSaving(false);
    }
  }

  const age = athleteAgeYears(birthDate || null);
  const showLoadWarning = Boolean(loadError) || (initial == null && remoteProfile.isError);

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {showLoadWarning ? (
        <p className="text-destructive text-sm" role="alert">
          {loadError ??
            'Chargement du profil impossible. Les champs vides ne reflètent pas forcément la base — réessaie avant d’enregistrer.'}
        </p>
      ) : null}
      <ProfileFormSection title="Identité & rythme de vie" compact>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="heightCm">Taille (cm)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="heightCm"
              max={250}
              min={100}
              placeholder="178"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
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
              className={NUMERIC_INPUT_CLASS}
              id="sleepHours"
              max={12}
              min={4}
              placeholder="8"
              step={0.25}
              type="number"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Entre 4 et 12 heures.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleepBedtime">Coucher visé (HH:mm)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="sleepBedtime"
              placeholder="22:30"
              value={sleepBedtime}
              onChange={(e) => setSleepBedtime(e.target.value)}
            />
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
      <Button disabled={saving} type="submit">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
