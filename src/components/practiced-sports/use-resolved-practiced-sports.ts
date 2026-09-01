'use client';

import { useMemo } from 'react';
import { useAthleteProfile } from '@/hooks/use-data';
import { normalizeAthletePracticedSports, type PracticedSportId } from '@/lib/practiced-sports';

/** Prefer explicit override (onboarding), else profile, else all-core default. */
export function useResolvedPracticedSports(
  override?: readonly PracticedSportId[],
): PracticedSportId[] {
  const { data } = useAthleteProfile();
  return useMemo(() => {
    if (override) {
      return [...override];
    }
    return normalizeAthletePracticedSports(data?.practicedSports).sports;
  }, [override, data?.practicedSports]);
}
