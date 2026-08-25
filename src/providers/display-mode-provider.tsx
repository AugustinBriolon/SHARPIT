'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { useAthleteProfile } from '@/hooks/use-data';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import type { AthleteProfilePayload } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { sendJson } from '@/lib/query/send-json';
import {
  DEFAULT_DISPLAY_MODE,
  isExpertMode,
  toDisplayMode,
  type DisplayMode,
} from '@/lib/preferences/display-mode';
import {
  DEMO_DISPLAY_MODE_KEY,
  getDemoDisplayModeOverride,
} from '@/components/display-mode/expert-mode-toggle';

type DisplayModeContextValue = {
  mode: DisplayMode;
  isExpert: boolean;
  /** False until the profile has answered — expert blocks wait rather than flash. */
  isResolved: boolean;
  setMode: (mode: DisplayMode) => void;
};

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

/**
 * The density lives on the athlete profile, so it arrives with the profile
 * query rather than before paint. Expert blocks are secondary detail: they may
 * appear a beat after the page, but must never appear and then vanish — which
 * is why `isResolved` gates them instead of the default reading.
 */
export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const profile = useAthleteProfile();
  const queryClient = useQueryClient();
  const isDemo = useIsDemoMode();

  const demoOverride = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const handler = () => onStoreChange();
      window.addEventListener('sharpit:demo-display-mode', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('sharpit:demo-display-mode', handler);
        window.removeEventListener('storage', handler);
      };
    },
    getDemoDisplayModeOverride,
    () => null,
  );

  const profileMode = toDisplayMode(profile.data?.displayMode);
  const mode = isDemo ? (demoOverride ?? profileMode) : profileMode;

  const save = useMutation({
    mutationFn: (next: DisplayMode) =>
      sendJson('/api/athlete-profile', 'PATCH', { displayMode: next }),
    onMutate: async (next: DisplayMode) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.athleteProfile });
      const previous = queryClient.getQueryData<AthleteProfilePayload>(queryKeys.athleteProfile);
      if (previous) {
        queryClient.setQueryData<AthleteProfilePayload>(queryKeys.athleteProfile, {
          ...previous,
          displayMode: next,
        });
      }
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.athleteProfile, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
    },
  });

  const setMode = useCallback(
    (next: DisplayMode) => {
      if (isDemo) {
        try {
          localStorage.setItem(DEMO_DISPLAY_MODE_KEY, next);
          window.dispatchEvent(new Event('sharpit:demo-display-mode'));
        } catch {
          // ignore
        }
        return;
      }
      save.mutate(next);
    },
    [isDemo, save],
  );

  const value = useMemo<DisplayModeContextValue>(
    () => ({
      mode,
      isExpert: isExpertMode(mode),
      isResolved: profile.isSuccess || profile.isError,
      setMode,
    }),
    [mode, profile.isError, profile.isSuccess, setMode],
  );

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
}

/**
 * Readable outside the provider — a surface rendered without it (offline shell,
 * isolated test) falls back to the accessible reading instead of throwing.
 */
export function useDisplayMode(): DisplayModeContextValue {
  return (
    useContext(DisplayModeContext) ?? {
      mode: DEFAULT_DISPLAY_MODE,
      isExpert: false,
      isResolved: true,
      setMode: () => {},
    }
  );
}
