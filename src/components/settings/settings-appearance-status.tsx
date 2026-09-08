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

/** Read at a glance from the hub — Apparence owns theme only. */
export function SettingsAppearanceStatus() {
  const { preference } = useThemePreference();
  const theme = THEME_LABELS[preference] ?? preference;
  return <span className="text-muted-foreground">{theme}</span>;
}

/** Density / Mode Expert — Personnalisation hub meta. */
export function SettingsPersonalizationStatus() {
  const { mode, isResolved } = useDisplayMode();
  if (!isResolved) {
    return <span className="text-muted-foreground">…</span>;
  }
  return <span className="text-muted-foreground">{DENSITY_LABELS[mode] ?? mode}</span>;
}

/** @deprecated Prefer SettingsPersonalizationStatus — Mode Expert is on Personnalisation. */
export function SettingsExpertModeStatus() {
  return <SettingsPersonalizationStatus />;
}
