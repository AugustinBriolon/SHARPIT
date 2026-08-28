import { Activity, MessagesSquare, NotebookText, Watch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ProPerk = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: 'live' | 'soon';
  /** Only set for `status: 'live'` — a `soon` perk has nowhere to land yet. */
  href?: string;
};

export const PRO_PERKS: ProPerk[] = [
  {
    icon: NotebookText,
    title: 'Bilan hebdomadaire',
    description:
      'Volume, charge, sommeil et récupération de la semaine, synthétisés par le coach — avec un plan pour la semaine suivante.',
    status: 'live',
    href: '/training/weekly-review',
  },
  {
    icon: Activity,
    title: 'Analyse de séance',
    description:
      'Interprétation approfondie de chaque entraînement : ce qui a marché, ce qui a coûté cher, ce que ça change pour la suite.',
    status: 'soon',
  },
  {
    icon: Watch,
    title: 'Envoi vers la montre',
    description: 'Pousse tes séances planifiées directement sur ta montre connectée.',
    status: 'soon',
  },
  {
    icon: MessagesSquare,
    title: 'Volume de coach étendu',
    description: 'Plus de questions au coach par jour que le quota de base.',
    status: 'soon',
  },
];
