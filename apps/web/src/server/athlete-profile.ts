import 'server-only';

import type { mapAthleteProfileToFormData } from '@sharpit/server/lib/profile/map-athlete-profile';
import type { ConsentSnapshot } from '@sharpit/server/lib/privacy/consent-serialize';
import { cachedServerApiJson } from '@/server/api-client';

type ProfileRow = NonNullable<Parameters<typeof mapAthleteProfileToFormData>[0]> & {
  equipment?: unknown;
  practicedSports?: unknown;
};

/** The signed-in athlete's profile row, from `api.` (the same payload the client fetches). */
export function getAthleteProfileRow(): Promise<ProfileRow | null> {
  return cachedServerApiJson<ProfileRow>('/api/athlete-profile', true);
}

/** The athlete's consents as ISO snapshots, from `api.`. */
export async function getConsentSnapshot(): Promise<ConsentSnapshot | null> {
  const body = await cachedServerApiJson<{ consents: ConsentSnapshot }>('/api/privacy/consent');
  return body?.consents ?? null;
}
