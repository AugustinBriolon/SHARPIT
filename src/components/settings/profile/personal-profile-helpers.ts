import { parseClockInput, clockToInput } from '@/components/settings/profile/profile-input-format';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import { commitProfileSave, saveProfilePatch } from '@/components/settings/profile/profile-save';
import { changedProfileFields } from '@/lib/profile/profile-patch';
import { birthDateToInput } from '@/lib/profile/athlete-profile-utils';
import type { QueryClient } from '@tanstack/react-query';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type PersonalFieldKey = 'heightCm' | 'sleepHours' | 'sleepBedtime';

export type PersonalProfileFormState = {
  heightCm: string;
  birthDate: string;
  sleepHours: string;
  sleepBedtime: string;
};

function sleepHoursFromProfile(resolvedInitial: ProfileData | null | undefined): string {
  const minutes = resolvedInitial?.sleepTargetMinutes;
  if (minutes === null || minutes === undefined) {
    return '';
  }
  return String(minutes / 60);
}

export function personalProfileBaseline(
  resolvedInitial: ProfileData | null | undefined,
): PersonalProfileFormState {
  return {
    heightCm: resolvedInitial?.heightCm?.toString() ?? '',
    birthDate: birthDateToInput(resolvedInitial?.birthDate ?? null),
    sleepHours: sleepHoursFromProfile(resolvedInitial),
    sleepBedtime: clockToInput(resolvedInitial?.sleepBedtimeTargetMin ?? null),
  };
}

export function isPersonalProfileDirty(
  state: PersonalProfileFormState,
  baseline: PersonalProfileFormState,
) {
  return (
    state.heightCm !== baseline.heightCm ||
    state.birthDate !== baseline.birthDate ||
    state.sleepHours !== baseline.sleepHours ||
    state.sleepBedtime !== baseline.sleepBedtime
  );
}

function validateHeight(heightCm: string): string | undefined {
  if (!heightCm.trim()) {
    return undefined;
  }
  const h = Number(heightCm);
  if (!Number.isFinite(h) || h < 100 || h > 250) {
    return 'Taille invalide (entre 100 et 250 cm).';
  }
  return undefined;
}

function validateSleepHours(sleepHours: string): string | undefined {
  if (!sleepHours.trim()) {
    return undefined;
  }
  const sleepMinutes = Math.round(Number(sleepHours) * 60);
  if (!Number.isFinite(sleepMinutes) || sleepMinutes < 240 || sleepMinutes > 720) {
    return 'Objectif sommeil invalide (entre 4 h et 12 h).';
  }
  return undefined;
}

function validateSleepBedtime(sleepBedtime: string): string | undefined {
  if (!sleepBedtime.trim()) {
    return undefined;
  }
  if (parseClockInput(sleepBedtime) === null) {
    return 'Heure de coucher invalide (format HH:mm).';
  }
  return undefined;
}

export function validatePersonalProfileFields(
  state: PersonalProfileFormState,
): Partial<Record<PersonalFieldKey, string>> {
  const next: Partial<Record<PersonalFieldKey, string>> = {};
  const heightError = validateHeight(state.heightCm);
  if (heightError) {
    next.heightCm = heightError;
  }
  const sleepError = validateSleepHours(state.sleepHours);
  if (sleepError) {
    next.sleepHours = sleepError;
  }
  const bedtimeError = validateSleepBedtime(state.sleepBedtime);
  if (bedtimeError) {
    next.sleepBedtime = bedtimeError;
  }
  return next;
}

export function firstPersonalProfileFieldError(
  errors: Partial<Record<PersonalFieldKey, string>>,
): PersonalFieldKey | undefined {
  return (['heightCm', 'sleepHours', 'sleepBedtime'] as const).find((key) => errors[key]);
}

function parseSleepTargetMinutes(sleepHours: string): number | null {
  if (!sleepHours.trim()) {
    return null;
  }
  return Math.round(Number(sleepHours) * 60);
}

function parseProfileHeightCm(heightCm: string): number | null {
  if (!heightCm.trim()) {
    return null;
  }
  return Number(heightCm);
}

function parseProfileBirthDate(birthDate: string): string | null {
  return birthDate.trim() || null;
}

function resolvedProfileSnapshot(resolvedInitial: ProfileData | null | undefined) {
  if (!resolvedInitial) {
    return {
      heightCm: null,
      birthDate: null,
      sleepTargetMinutes: null,
      sleepBedtimeTargetMin: null,
    };
  }
  return {
    heightCm: resolvedInitial.heightCm,
    birthDate: resolvedInitial.birthDate,
    sleepTargetMinutes: resolvedInitial.sleepTargetMinutes,
    sleepBedtimeTargetMin: resolvedInitial.sleepBedtimeTargetMin,
  };
}

function personalProfileDraft(state: PersonalProfileFormState) {
  return {
    heightCm: parseProfileHeightCm(state.heightCm),
    birthDate: parseProfileBirthDate(state.birthDate),
    sleepTargetMinutes: parseSleepTargetMinutes(state.sleepHours),
    sleepBedtimeTargetMin: parseClockInput(state.sleepBedtime),
  };
}

function buildPersonalProfilePatch(
  state: PersonalProfileFormState,
  resolvedInitial: ProfileData | null | undefined,
) {
  return changedProfileFields(
    resolvedProfileSnapshot(resolvedInitial),
    personalProfileDraft(state),
  );
}

export async function submitPersonalProfile(options: {
  state: PersonalProfileFormState;
  resolvedInitial: ProfileData | null | undefined;
  queryClient: QueryClient;
  router: AppRouterInstance;
}) {
  const { state, resolvedInitial, queryClient, router } = options;
  const patch = buildPersonalProfilePatch(state, resolvedInitial);

  if (Object.keys(patch).length === 0) {
    return { kind: 'noop' as const };
  }

  const previousProfile = saveProfilePatch(queryClient, patch);
  const res = await fetch('/api/athlete-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  await commitProfileSave(queryClient, router, res, previousProfile);
  return { kind: 'saved' as const };
}
