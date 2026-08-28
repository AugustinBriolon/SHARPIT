'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { useGoals, usePlannedSessions } from '@/hooks/use-data';
import { fetchPlannedSessionById } from '@/lib/query/fetchers';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { queryKeys } from '@/lib/query/keys';
import {
  seedPlannedSessionIntoCache,
  type PlannedSessionCacheSeed,
} from '@/lib/query/seed-planned-session-cache';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { EMPTY_GOALS } from '@/components/planning/session/session-defaults';

const PlannedSessionDialog = dynamic(
  () =>
    import('@/components/planning/session/edit/planned-session-dialog').then(
      (mod) => mod.PlannedSessionDialog,
    ),
  { ssr: false },
);

export type OpenPlannedSessionOptions = {
  sessionId: string;
  /** When opened from the linked activity detail — hide “see activity” nav. */
  omitLinkedActivityNavigation?: boolean;
  /** Morning recalibration — show Plan vs proposée in the read view. */
  morningProposal?: MorningProposalCompareInput;
  /** Optional fields already known (activity chip) so the modal is Instant-complete. */
  seed?: Omit<PlannedSessionCacheSeed, 'id'>;
};

type AppModalContextValue = {
  openPlannedSession: (options: OpenPlannedSessionOptions) => void;
  closePlannedSession: () => void;
};

const AppModalContext = createContext<AppModalContextValue | null>(null);

export function useAppModal(): AppModalContextValue {
  const ctx = useContext(AppModalContext);
  if (!ctx) {
    throw new Error('useAppModal must be used within AppModalProvider');
  }
  return ctx;
}

/** Optional — returns null outside the provider (e.g. isolated tests). */
export function useAppModalOptional(): AppModalContextValue | null {
  return useContext(AppModalContext);
}

export function AppModalProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const [plannedModal, setPlannedModal] = useState<OpenPlannedSessionOptions | null>(null);
  const [fetchedSession, setFetchedSession] = useState<ClientPlannedSession | null>(null);
  const [fetchingSession, setFetchingSession] = useState(false);

  const closePlannedSession = useCallback(() => {
    setPlannedModal(null);
    setFetchedSession(null);
    setFetchingSession(false);
  }, []);

  const openPlannedSession = useCallback(
    (options: OpenPlannedSessionOptions) => {
      if (options.seed) {
        seedPlannedSessionIntoCache(queryClient, {
          id: options.sessionId,
          ...options.seed,
        });
      }
      prefetchPlannedSessionDetail(queryClient, options.sessionId);
      setFetchedSession(null);
      setFetchingSession(false);
      setPlannedModal(options);
      if (!queryClient.getQueryData(queryKeys.plannedSessions)) {
        void plannedQuery.refetch();
      }
    },
    [plannedQuery, queryClient],
  );

  const sessionFromList = useMemo(() => {
    if (!plannedModal) {
      return null;
    }
    return plannedQuery.data?.find((item) => item.id === plannedModal.sessionId) ?? null;
  }, [plannedModal, plannedQuery.data]);

  const session = sessionFromList ?? fetchedSession;

  useEffect(() => {
    if (!plannedModal || sessionFromList || fetchingSession) {
      return;
    }

    let cancelled = false;
    setFetchingSession(true);

    void fetchPlannedSessionById(plannedModal.sessionId)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        seedPlannedSessionIntoCache(queryClient, loaded);
        setFetchedSession(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setPlannedModal(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchingSession, plannedModal, queryClient, sessionFromList]);

  const value = useMemo(
    () => ({ openPlannedSession, closePlannedSession }),
    [openPlannedSession, closePlannedSession],
  );

  return (
    <AppModalContext.Provider value={value}>
      {children}
      {plannedModal && session ? (
        <PlannedSessionDialog
          goals={goalsQuery.data ?? EMPTY_GOALS}
          morningProposal={plannedModal.morningProposal}
          omitLinkedActivityNavigation={plannedModal.omitLinkedActivityNavigation}
          session={session}
          onClose={closePlannedSession}
        />
      ) : null}
    </AppModalContext.Provider>
  );
}
