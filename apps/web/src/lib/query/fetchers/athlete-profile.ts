import type { DisplayMode } from '@/lib/preferences/display-mode';
import { sendJson } from '@/lib/query/send-json';
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

export async function patchAthleteProfile(
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return sendJson('/api/athlete-profile', 'PATCH', patch) as Promise<Record<string, unknown>>;
}

/** Fire-and-forget unload save — must use keepalive; do not await JSON. */
export function patchAthleteProfileKeepalive(patch: Record<string, unknown>): void {
  void fetch('/api/athlete-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    keepalive: true,
  });
}

export type GarminProfileImportResult = {
  imported: boolean;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m?: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  failedSources?: string[];
  error?: string;
};

export async function importGarminAthleteProfile(): Promise<GarminProfileImportResult> {
  const res = await fetch('/api/athlete-profile/import-garmin', { method: 'POST' });
  const data = (await res.json().catch(() => null)) as
    (GarminProfileImportResult & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(data?.error ?? 'Import Garmin impossible');
  }
  return (
    data ?? {
      imported: false,
      ftpW: null,
      maxHr: null,
      lthr: null,
      runThresholdPaceSecPerKm: null,
      vo2maxRunning: null,
      vo2maxCycling: null,
    }
  );
}

export async function postAthleteHomeLocation(body: unknown): Promise<unknown> {
  return sendJson('/api/athlete-profile/home-location', 'POST', body);
}
