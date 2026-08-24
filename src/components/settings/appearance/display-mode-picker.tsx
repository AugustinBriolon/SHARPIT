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
  const { mode, setMode, isResolved } = useDisplayMode();

  if (!isResolved) {
    return (
      <div aria-label="Densité de lecture" className="space-y-3" aria-busy>
        <div className="bg-muted/45 h-[4.5rem] animate-pulse rounded-xl" />
        <div className="bg-muted/45 h-[4.5rem] animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <PreferenceRadioGroup
      label="Densité de lecture"
      options={OPTIONS}
      value={mode}
      onChange={setMode}
    />
  );
}
