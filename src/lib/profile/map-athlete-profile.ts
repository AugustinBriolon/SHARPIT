import { birthDateToInput } from '@/lib/profile/athlete-profile-utils';

/** Shape consumed by settings / progression profile forms. */
export type AthleteProfileFormData = {
  heightCm: number | null;
  birthDate: string | null;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m: number | null;
  defaultPoolLengthM: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  thresholdsSyncedAt: string | null;
  sleepTargetMinutes: number | null;
  sleepBedtimeTargetMin: number | null;
};

type ProfileRow = {
  heightCm?: number | null;
  birthDate?: Date | string | null;
  ftpW?: number | null;
  maxHr?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
  swimCssSecPer100m?: number | null;
  defaultPoolLengthM?: number | null;
  vo2maxRunning?: number | null;
  vo2maxCycling?: number | null;
  thresholdsSyncedAt?: Date | string | null;
  sleepTargetMinutes?: number | null;
  sleepBedtimeTargetMin?: number | null;
};

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

/** Map a Prisma / API athlete profile row into form-ready data. */
export function mapAthleteProfileToFormData(
  profile: ProfileRow | null | undefined,
): AthleteProfileFormData | null {
  if (!profile) return null;
  return {
    heightCm: profile.heightCm ?? null,
    birthDate: birthDateToInput(profile.birthDate),
    ftpW: profile.ftpW ?? null,
    maxHr: profile.maxHr ?? null,
    lthr: profile.lthr ?? null,
    runThresholdPaceSecPerKm: profile.runThresholdPaceSecPerKm ?? null,
    swimCssSecPer100m: profile.swimCssSecPer100m ?? null,
    defaultPoolLengthM: profile.defaultPoolLengthM ?? null,
    vo2maxRunning: profile.vo2maxRunning ?? null,
    vo2maxCycling: profile.vo2maxCycling ?? null,
    thresholdsSyncedAt: toIsoOrNull(profile.thresholdsSyncedAt),
    sleepTargetMinutes: profile.sleepTargetMinutes ?? null,
    sleepBedtimeTargetMin: profile.sleepBedtimeTargetMin ?? null,
  };
}

/**
 * Decide whether a new `initial` snapshot should overwrite local form state.
 * Null/undefined means load failed or pending — never wipe fields the athlete already sees.
 */
export function shouldHydrateProfileForm(
  initial: AthleteProfileFormData | null | undefined,
): initial is AthleteProfileFormData {
  return initial != null;
}
