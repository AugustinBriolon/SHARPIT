/**
 * Route registry — single source of truth for back-navigation labels
 * and default parent fallbacks (when the app-managed stack is empty).
 *
 * Matched top-down: first regex wins.
 */

export type RouteEntry = {
  /** Displayed by MobileBackLink and pushed on the stack. */
  label: string;
  /** Fallback destination when the nav stack has no previous entry. */
  defaultParent?: { href: string; label: string };
};

type Matcher = {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => RouteEntry;
};

const HOME_PARENT = { href: '/', label: 'Accueil' } as const;
const TRAINING_PARENT = { href: '/training', label: 'Entraînement' } as const;
const HISTORY_PARENT = { href: '/training/history', label: 'Historique' } as const;
const SETTINGS_PARENT = { href: '/settings', label: 'Réglages' } as const;
const TODAY_PARENT = { href: '/', label: 'Aujourd’hui' } as const;

const MATCHERS: Matcher[] = [
  { pattern: /^\/$/, resolve: () => ({ label: 'Aujourd’hui' }) },
  { pattern: /^\/coach$/, resolve: () => ({ label: 'Coach', defaultParent: HOME_PARENT }) },

  {
    pattern: /^\/training$/,
    resolve: () => ({ label: 'Entraînement', defaultParent: HOME_PARENT }),
  },
  {
    pattern: /^\/training\/history$/,
    resolve: () => ({ label: 'Historique', defaultParent: TRAINING_PARENT }),
  },
  {
    pattern: /^\/training\/manual$/,
    resolve: () => ({ label: 'Nouvelle activité', defaultParent: HISTORY_PARENT }),
  },
  {
    pattern: /^\/training\/progression$/,
    resolve: () => ({ label: 'Progression', defaultParent: TRAINING_PARENT }),
  },
  {
    pattern: /^\/training\/planning$/,
    resolve: () => ({ label: 'Planification', defaultParent: TRAINING_PARENT }),
  },
  {
    pattern: /^\/training\/calendar$/,
    resolve: () => ({ label: 'Calendrier', defaultParent: TRAINING_PARENT }),
  },
  {
    pattern: /^\/training\/sessions$/,
    resolve: () => ({ label: 'Séances prévues', defaultParent: TRAINING_PARENT }),
  },
  {
    pattern: /^\/training\/([^/]+)\/edit$/,
    resolve: (m) => ({
      label: 'Édition',
      defaultParent: { href: `/training/${m[1]}`, label: 'Séance' },
    }),
  },
  {
    pattern: /^\/training\/[^/]+$/,
    resolve: () => ({ label: 'Séance', defaultParent: HISTORY_PARENT }),
  },

  {
    pattern: /^\/today\/recovery$/,
    resolve: () => ({ label: 'Récupération', defaultParent: TODAY_PARENT }),
  },
  {
    pattern: /^\/today\/effort$/,
    resolve: () => ({ label: 'Effort', defaultParent: TODAY_PARENT }),
  },
  {
    pattern: /^\/today\/sleep$/,
    resolve: () => ({ label: 'Sommeil', defaultParent: TODAY_PARENT }),
  },
  {
    pattern: /^\/today\/adaptation$/,
    resolve: () => ({ label: 'Adaptation', defaultParent: TODAY_PARENT }),
  },

  {
    pattern: /^\/biology$/,
    resolve: () => ({ label: 'Corps', defaultParent: HOME_PARENT }),
  },

  { pattern: /^\/settings$/, resolve: () => ({ label: 'Réglages', defaultParent: HOME_PARENT }) },
  {
    pattern: /^\/settings\/account$/,
    resolve: () => ({ label: 'Compte', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/goals$/,
    resolve: () => ({ label: 'Objectifs', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/integrations$/,
    resolve: () => ({ label: 'Intégrations', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/maintenance$/,
    resolve: () => ({ label: 'Maintenance', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/appearance$/,
    resolve: () => ({ label: 'Apparence', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/equipment$/,
    resolve: () => ({ label: 'Équipement', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/about$/,
    resolve: () => ({ label: 'À propos', defaultParent: SETTINGS_PARENT }),
  },
  {
    pattern: /^\/settings\/memory$/,
    resolve: () => ({ label: 'Mémoire du coach', defaultParent: SETTINGS_PARENT }),
  },
];

/** Strip search + hash to run the pathname against the matchers. */
function pathnameOf(href: string): string {
  const noHash = href.split('#', 1)[0]!;
  return noHash.split('?', 1)[0]!;
}

function match(href: string): { entry: RouteEntry } | null {
  const pathname = pathnameOf(href);
  for (const { pattern, resolve } of MATCHERS) {
    const m = pathname.match(pattern);
    if (m) return { entry: resolve(m) };
  }
  return null;
}

/** Human label for a pushed stack entry. */
export function resolveRouteLabel(href: string): string {
  return match(href)?.entry.label ?? 'Retour';
}

/** Where to send Back when the app stack is empty for this route. */
export function resolveRouteFallback(href: string): { href: string; label: string } {
  const entry = match(href)?.entry;
  return entry?.defaultParent ?? HOME_PARENT;
}
