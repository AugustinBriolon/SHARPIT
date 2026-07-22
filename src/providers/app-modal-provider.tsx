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
import { useQueryClient } from '@tanstack/react-query';
import { PlannedSessionDialog } from '@/components/planning/session/planned-session-dialog';
import { useGoals, usePlannedSessions } from '@/hooks/use-data';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { queryKeys } from '@/lib/query/keys';

export type OpenPlannedSessionOptions = {
  sessionId: string;
  /** When opened from the linked activity detail — hide “see activity” nav. */
  omitLinkedActivityNavigation?: boolean;
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

  const closePlannedSession = useCallback(() => {
    setPlannedModal(null);
  }, []);

  const openPlannedSession = useCallback(
    (options: OpenPlannedSessionOptions) => {
      prefetchPlannedSessionDetail(queryClient, options.sessionId);
      setPlannedModal(options);
      if (!queryClient.getQueryData(queryKeys.plannedSessions)) {
        void plannedQuery.refetch();
      }
    },
    [plannedQuery, queryClient],
  );

  const session = useMemo(() => {
    if (!plannedModal) return null;
    return plannedQuery.data?.find((item) => item.id === plannedModal.sessionId) ?? null;
  }, [plannedModal, plannedQuery.data]);

  useEffect(() => {
    if (!plannedModal) return;
    if (plannedQuery.isLoading || plannedQuery.isFetching) return;
    if (!session) setPlannedModal(null);
  }, [plannedModal, plannedQuery.isFetching, plannedQuery.isLoading, session]);

  const value = useMemo(
    () => ({ openPlannedSession, closePlannedSession }),
    [openPlannedSession, closePlannedSession],
  );

  return (
    <AppModalContext.Provider value={value}>
      {children}
      {plannedModal && session ? (
        <PlannedSessionDialog
          goals={goalsQuery.data ?? []}
          omitLinkedActivityNavigation={plannedModal.omitLinkedActivityNavigation}
          session={session}
          onClose={closePlannedSession}
        />
      ) : null}
    </AppModalContext.Provider>
  );
}
