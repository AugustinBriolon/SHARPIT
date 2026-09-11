import type { DisplayMode } from '@/lib/preferences/display-mode';
import { fetchJson } from './shared';

export interface AthleteProfilePayload {
  heightCm: number | null;
  birthDate: string | null;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m: number | null;
  defaultPoolLengthM: number | null;
  sleepTargetMinutes: number | null;
  sleepBedtimeTargetMin: number | null;
  displayMode: DisplayMode;
  /** Mirrored in `sharpit.access-tier` cookie for Instant Pro chrome. */
  tier?: 'FREE' | 'PRO';
  equipment?: unknown;
  practicedSports?: unknown;
}

export async function fetchAthleteProfile(): Promise<AthleteProfilePayload> {
  return fetchJson<AthleteProfilePayload>('/api/athlete-profile');
}
