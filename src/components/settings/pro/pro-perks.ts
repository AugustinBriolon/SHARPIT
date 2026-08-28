import { Activity, MessagesSquare, NotebookText, Watch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ProPerk = {
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * `pro`: actually gated by hasProAccess() today.
   * `included`: real, shipped, free for every athlete today — not a Pro perk yet.
   * `planned`: not built — no href, nothing to link to.
   */
  status: 'pro' | 'included' | 'planned';
  href?: string;
};

/** Réservé au palier Pro aujourd'hui — vérifié dans le code avant chaque ajout ici. */
export const PRO_ONLY_PERKS: ProPerk[] = [
  {
    icon: NotebookText,
    title: 'Bilan hebdomadaire',
    description:
      'Volume, charge, sommeil et récupération de la semaine, synthétisés par le coach — avec un plan pour la semaine suivante.',
    status: 'pro',
    href: '/training/weekly-review',
  },
  {
    icon: Activity,
    title: 'Analyse de séance',
    description:
      'Interprétation approfondie de chaque entraînement : ce qui a marché, ce qui a coûté cher, ce que ça change pour la suite. 3 essais gratuits offerts, sur les séances de ton choix.',
    status: 'pro',
    href: '/training',
  },
];

/** Déjà là, gratuit, pour tout le monde — pas encore une raison de payer. */
export const INCLUDED_FOR_EVERYONE: ProPerk[] = [
  {
    icon: Watch,
    title: 'Envoi vers la montre',
    description: 'Pousse tes séances planifiées directement sur ta montre connectée.',
    status: 'included',
    href: '/training',
  },
];

/** Sur la feuille de route, rien à montrer encore. */
export const PLANNED_PERKS: ProPerk[] = [
  {
    icon: MessagesSquare,
    title: 'Volume de coach étendu',
    description: 'Plus de questions au coach par jour que le quota de base.',
    status: 'planned',
  },
];
