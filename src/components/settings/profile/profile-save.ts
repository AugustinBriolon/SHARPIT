import type { useQueryClient } from '@tanstack/react-query';
import type { useRouter } from 'next/navigation';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { queryKeys } from '@/lib/query/keys';

export function saveProfilePatch(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: Record<string, unknown>,
) {
  const previousProfile = queryClient.getQueryData(queryKeys.athleteProfile);
  queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
    if (!current || typeof current !== 'object') return current;
    return { ...current, ...patch };
  });
  return previousProfile;
}

async function parseProfileError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    detail?: string;
    details?: { fieldErrors?: Record<string, string[]> };
  } | null;
  const fieldMsg = data?.details?.fieldErrors
    ? Object.values(data.details.fieldErrors).flat().join(' · ')
    : null;
  return fieldMsg || data?.detail || data?.error || 'Erreur';
}

export async function commitProfileSave(
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
  res: Response,
  previousProfile: unknown,
): Promise<Record<string, unknown> | null> {
  if (!res.ok) {
    if (previousProfile !== undefined) {
      queryClient.setQueryData(queryKeys.athleteProfile, previousProfile);
    }
    throw new Error(await parseProfileError(res));
  }
  const saved = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (saved && typeof saved === 'object') {
    queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
      if (!current || typeof current !== 'object') return saved;
      return { ...current, ...saved };
    });
  }
  // Bust Next.js client Router Cache so Server Component `initial` is fresh on re-enter.
  router.refresh();
  await invalidateAfterAthleteProfileSave(queryClient);
  return saved;
}
