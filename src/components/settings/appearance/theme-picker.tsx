'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import {
  PreferenceRadioGroup,
  type PreferenceOption,
} from '@/components/settings/preference-radio-group';
import type { ThemePreference } from '@/lib/theme/theme';
import { useThemePreference } from '@/providers/theme-provider';

const OPTIONS: readonly PreferenceOption<ThemePreference>[] = [
  {
    id: 'light',
    title: 'Clair',
    description: 'Palette claire pour un usage diurne.',
    icon: Sun,
  },
  {
    id: 'dark',
    title: 'Sombre',
    description: 'Palette sombre pour réduire la distraction visuelle.',
    icon: Moon,
  },
  {
    id: 'system',
    title: 'Système',
    description: 'Suit automatiquement la préférence du système.',
    icon: Monitor,
  },
];

export function AppearanceThemePicker() {
  const { preference, setPreference } = useThemePreference();

  return (
    <PreferenceRadioGroup
      label="Thème de l'application"
      options={OPTIONS}
      value={preference}
      onChange={setPreference}
    />
  );
}
