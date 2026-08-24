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

/** Both preferences the Apparence page owns, read at a glance from the hub. */
export function SettingsAppearanceStatus() {
  const { preference } = useThemePreference();
  const { mode } = useDisplayMode();

  const theme = THEME_LABELS[preference] ?? preference;
  const density = DENSITY_LABELS[mode] ?? mode;

  return <>{`${theme} · ${density}`}</>;
}
