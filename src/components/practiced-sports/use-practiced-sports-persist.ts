'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  hasCorePracticedSport,
  normalizeAthletePracticedSports,
  type AthletePracticedSports,
  type PracticedSportId,
} from '@/lib/practiced-sports';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { queryKeys } from '@/lib/query/keys';

const SAVE_DEBOUNCE_MS = 450;

function sportsEqual(a: readonly PracticedSportId[], b: readonly PracticedSportId[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((id, index) => id === b[index]);
}

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    detail?: string;
  } | null;
  return data?.detail || data?.error || "Impossible d'enregistrer les sports";
}

export function usePracticedSportsPersist(initial: AthletePracticedSports) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sports, setSports] = useState<PracticedSportId[]>(
    () => normalizeAthletePracticedSports(initial).sports,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sportsRef = useRef(sports);
  const savedRef = useRef(sports);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);

  useEffect(() => {
    sportsRef.current = sports;
  }, [sports]);

  useEffect(() => {
    const next = normalizeAthletePracticedSports(initial).sports;
    if (sportsEqual(next, sportsRef.current)) {
      return;
    }
    setSports(next);
    savedRef.current = next;
    sportsRef.current = next;
  }, [initial]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    async (payload: PracticedSportId[]) => {
      if (!hasCorePracticedSport(payload)) {
        setError('Choisis au moins un sport d’endurance.');
        return;
      }

      const seq = ++saveSeq.current;
      const body: AthletePracticedSports = { version: 1, sports: payload };
      setSaving(true);
      setError(null);
      setMessage(null);

      queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
        if (!current || typeof current !== 'object') {
          return current;
        }
        return { ...current, practicedSports: body };
      });

      try {
        const res = await fetch('/api/athlete-profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ practicedSports: body }),
        });
        if (!res.ok) {
          throw new Error(await parseError(res));
        }
        if (seq === saveSeq.current) {
          savedRef.current = payload;
          setMessage('Sports enregistrés.');
        }
        router.refresh();
        await invalidateAfterAthleteProfileSave(queryClient);
      } catch (err) {
        if (seq === saveSeq.current) {
          setSports(savedRef.current);
          sportsRef.current = savedRef.current;
          setError(err instanceof Error ? err.message : 'Erreur');
        }
      } finally {
        if (seq === saveSeq.current) {
          setSaving(false);
        }
      }
    },
    [queryClient, router],
  );

  function updateSports(next: PracticedSportId[]) {
    setSports(next);
    sportsRef.current = next;
    setError(null);
    setMessage(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist(sportsRef.current);
    }, SAVE_DEBOUNCE_MS);
  }

  return {
    sports,
    message,
    error,
    saving,
    updateSports,
    canSave: hasCorePracticedSport(sports),
  };
}
