/**
 * SharpIt Pro perks — the one list, shared by the web Pro page and `/api/v1/pro` (the
 * native app never duplicates the copy). Icons are a web concern, added in
 * `components/settings/pro/pro-perks.ts`.
 */
export type ProPerkData = {
  /** Stable key — the native app addresses perks by it. Never reuse one. */
  id: string;
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
export const PRO_ONLY_PERKS: ProPerkData[] = [
  {
    id: 'weekly-review',
    title: 'Bilan hebdomadaire',
    description:
      'Volume, charge, sommeil et récupération de la semaine, synthétisés par le coach — avec un plan pour la semaine suivante.',
    status: 'pro',
    href: '/plan/bilan',
  },
  {
    id: 'session-analysis',
    title: 'Analyse de séance',
    description:
      "Interprétation approfondie de chaque entraînement : ce qui a marché, ce qui a coûté cher, ce que ça change pour la suite. Gratuit à raison d'une séance par jour depuis ton inscription ; illimité et sur tes séances passées avec Pro.",
    status: 'pro',
    href: '/activite',
  },
  {
    id: 'journal-coach-read',
    title: 'Lecture coach · journal',
    description:
      'Sur tes analyses journal, le coach priorise les associations nettes et propose 1–2 expériences concrètes sur 7 jours — sans affirmer de causalité.',
    status: 'pro',
    href: '/journal/analyses',
  },
  {
    id: 'nutrition-reading',
    title: 'Lecture coach · nutrition',
    description:
      'Chaque jour, le coach lit ce que tu as mangé face à ton entraînement : carburant, qualité, régime, avec une action concrète. Ton journal alimentaire reste ouvert à tous.',
    status: 'pro',
  },
  {
    id: 'biological-age',
    title: 'Âge biologique',
    description:
      'Ton âge forme, calculé par SHARPIT à partir de ta VO₂max. Une estimation d’entraînement, pas un diagnostic.',
    status: 'pro',
  },
  {
    id: 'watch-push',
    title: 'Envoi vers la montre',
    description: 'Pousse tes séances planifiées directement sur ta montre connectée.',
    status: 'pro',
    href: '/plan/semaine',
  },
];

/** Déjà là, gratuit, pour tout le monde — pas encore une raison de payer. */
export const INCLUDED_FOR_EVERYONE: ProPerkData[] = [];

/** Sur la feuille de route, rien à montrer encore. */
export const PLANNED_PERKS: ProPerkData[] = [
  {
    id: 'extended-coach',
    title: 'Volume de coach étendu',
    description: 'Plus de questions au coach par jour que le quota de base.',
    status: 'planned',
  },
];

/** Every perk, in display order: Pro, then included, then planned. */
export const ALL_PRO_PERKS: ProPerkData[] = [
  ...PRO_ONLY_PERKS,
  ...INCLUDED_FOR_EVERYONE,
  ...PLANNED_PERKS,
];
