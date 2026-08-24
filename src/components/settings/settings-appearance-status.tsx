'use client';

import { useDisplayMode } from '@/providers/display-mode-provider';
import { useThemePreference } from '@/providers/theme-provider';

const THEME_LABELS: Record<string, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Système',
};

const DENSITY_LABELS: Record<string, string> = {
  essential: 'Essentiel',
  expert: 'Expert',
};

/** Read at a glance from the hub — the Apparence row owns the theme only. */
export function SettingsAppearanceStatus() {
  const { preference } = useThemePreference();
  return <>{THEME_LABELS[preference] ?? preference}</>;
}

/** Read at a glance from the hub — the Mode Expert row owns the density. */
export function SettingsExpertModeStatus() {
  const { mode, isResolved } = useDisplayMode();
  if (!isResolved) return <>…</>;
  return <>{DENSITY_LABELS[mode] ?? mode}</>;
}
