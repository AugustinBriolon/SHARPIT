'use client';

import { Gauge, Microscope } from 'lucide-react';
import {
  PreferenceRadioGroup,
  type PreferenceOption,
} from '@/components/settings/preference-radio-group';
import type { DisplayMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

const OPTIONS: readonly PreferenceOption<DisplayMode>[] = [
  {
    id: 'essential',
    title: 'Essentiel',
    description:
      "Ce qui s'est passé, ce que ça a coûté, ce qui vient. Les métriques techniques restent en retrait.",
    icon: Gauge,
  },
  {
    id: 'expert',
    title: 'Expert',
    description:
      'Ajoute la couche technique : TSS, IF, charge chronique, seuils, zones et découplage.',
    icon: Microscope,
  },
];

export function AppearanceDisplayModePicker() {
  const { mode, setMode } = useDisplayMode();

  return (
    <PreferenceRadioGroup
      label="Densité de lecture"
      options={OPTIONS}
      value={mode}
      onChange={setMode}
    />
  );
}
