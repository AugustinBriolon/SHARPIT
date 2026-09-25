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
import {
  applyResolvedTheme,
  getSystemTheme,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  resolveThemeForPreference,
  syncThemeCookie,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The server never resolves the theme — that would make the root layout
 * runtime-dependent and cost every route its prerendered shell. The pre-paint
 * THEME_INIT_SCRIPT owns the DOM; this provider owns React state and syncs to
 * the stored preference on mount.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveThemeForPreference('system'),
  );

  useEffect(() => {
    const stored = readStoredThemePreference();
    const nextResolved = resolveTheme(stored);

    setPreferenceState(stored);
    setResolved(nextResolved);
    applyResolvedTheme(nextResolved);
    syncThemeCookie(stored);
  }, []);

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const nextResolved = getSystemTheme();
      setResolved(nextResolved);
      applyResolvedTheme(nextResolved);
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    const nextResolved = resolveTheme(next);
    setPreferenceState(next);
    setResolved(nextResolved);
    persistThemePreference(next);
    applyResolvedTheme(nextResolved);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
    }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemeProvider');
  }
  return context;
}
