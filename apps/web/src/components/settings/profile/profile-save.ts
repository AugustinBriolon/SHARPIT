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
    if (!current || typeof current !== 'object') {
      return current;
    }
    return { ...current, ...patch };
  });
  return previousProfile;
}

export function rollbackProfilePatch(
  queryClient: ReturnType<typeof useQueryClient>,
  previousProfile: unknown,
) {
  if (previousProfile !== undefined) {
    queryClient.setQueryData(queryKeys.athleteProfile, previousProfile);
  }
}

export async function commitProfileSave(
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
  saved: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (saved && typeof saved === 'object') {
    queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
      if (!current || typeof current !== 'object') {
        return saved;
      }
      return { ...current, ...saved };
    });
  }
  // Bust Next.js client Router Cache so Server Component `initial` is fresh on re-enter.
  router.refresh();
  await invalidateAfterAthleteProfileSave(queryClient);
  return saved;
}
