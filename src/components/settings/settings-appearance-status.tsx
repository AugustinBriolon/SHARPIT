'use client';

import { useThemePreference } from '@/providers/theme-provider';

const LABELS: Record<string, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Système',
};

export function SettingsAppearanceStatus() {
  const { preference } = useThemePreference();
  return <>{LABELS[preference] ?? preference}</>;
}
