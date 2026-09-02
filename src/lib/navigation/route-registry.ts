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
  /**
   * Modal-like screen: never sits on the app nav stack.
   * After leaving, Back must return to the real previous page — not reopen this route.
   */
  transient?: boolean;
};

type Matcher = {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => RouteEntry;
};

const HOME_PARENT = { href: '/', label: 'Aujourd’hui' } as const;
const PLAN_PARENT = { href: '/plan', label: 'Plan' } as const;
const ACTIVITY_PARENT = { href: '/activite', label: 'Activité' } as const;
const HISTORY_PARENT = { href: '/training/history', label: 'Historique' } as const;
const TRIPS_PARENT = { href: '/training/trips', label: 'Séjours' } as const;
const MOI_PARENT = { href: '/moi', label: 'Moi' } as const;

const MATCHERS: Matcher[] = [
  { pattern: /^\/$/, resolve: () => ({ label: 'Aujourd’hui' }) },
  { pattern: /^\/plan$/, resolve: () => ({ label: 'Plan', defaultParent: HOME_PARENT }) },
  { pattern: /^\/activite$/, resolve: () => ({ label: 'Activité', defaultParent: HOME_PARENT }) },
  { pattern: /^\/moi$/, resolve: () => ({ label: 'Moi', defaultParent: HOME_PARENT }) },
  // Coach stays reachable but is not a primary tab (Shell V1).
  { pattern: /^\/coach$/, resolve: () => ({ label: 'Coach', defaultParent: HOME_PARENT }) },

  {
    pattern: /^\/training$/,
    resolve: () => ({ label: 'Fil de la semaine', defaultParent: PLAN_PARENT }),
  },
  {
    pattern: /^\/training\/history$/,
    resolve: () => ({ label: 'Historique', defaultParent: ACTIVITY_PARENT }),
  },
  {
    pattern: /^\/training\/manual$/,
    resolve: () => ({ label: 'Nouvelle activité', defaultParent: ACTIVITY_PARENT }),
  },
  {
    pattern: /^\/training\/planning$/,
    resolve: () => ({ label: 'Planification', defaultParent: PLAN_PARENT }),
  },
  {
    pattern: /^\/training\/weekly-review$/,
    resolve: () => ({ label: 'Bilan hebdo', defaultParent: PLAN_PARENT }),
  },
  // Both trip patterns must stay above the /training/:id catch-all below.
  {
    pattern: /^\/training\/trips$/,
    resolve: () => ({ label: 'Séjours', defaultParent: ACTIVITY_PARENT }),
  },
  {
    pattern: /^\/training\/trips\/[^/]+$/,
    resolve: () => ({ label: 'Séjour', defaultParent: TRIPS_PARENT }),
  },
  {
    pattern: /^\/training\/([^/]+)\/edit$/,
    resolve: (m) => ({
      label: 'Édition',
      defaultParent: { href: `/training/${m[1]}`, label: 'Séance' },
      transient: true,
    }),
  },
  {
    pattern: /^\/training\/[^/]+$/,
    resolve: () => ({ label: 'Séance', defaultParent: HISTORY_PARENT }),
  },

  {
    pattern: /^\/today\/recovery$/,
    resolve: () => ({ label: 'Récupération', defaultParent: HOME_PARENT }),
  },
  {
    pattern: /^\/today\/effort$/,
    resolve: () => ({ label: 'Effort', defaultParent: HOME_PARENT }),
  },
  {
    pattern: /^\/today\/sleep$/,
    resolve: () => ({ label: 'Sommeil', defaultParent: HOME_PARENT }),
  },
  {
    pattern: /^\/today\/adaptation$/,
    resolve: () => ({ label: 'Adaptation', defaultParent: HOME_PARENT }),
  },

  {
    pattern: /^\/progress$/,
    resolve: () => ({ label: 'Progression', defaultParent: MOI_PARENT }),
  },

  {
    pattern: /^\/nutrition$/,
    resolve: () => ({ label: 'Nutrition', defaultParent: HOME_PARENT }),
  },

  // `/settings` redirects to `/moi`; keep a label for any stack entry that still lands here.
  { pattern: /^\/settings$/, resolve: () => ({ label: 'Moi', defaultParent: HOME_PARENT }) },
  {
    pattern: /^\/settings\/account$/,
    resolve: () => ({ label: 'Compte', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/integrations$/,
    resolve: () => ({ label: 'Intégrations', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/maintenance$/,
    resolve: () => ({ label: 'Maintenance', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/appearance$/,
    resolve: () => ({ label: 'Apparence', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/appearance\/expert-mode$/,
    resolve: () => ({
      label: 'Mode Expert',
      defaultParent: MOI_PARENT,
    }),
  },
  {
    pattern: /^\/settings\/equipment$/,
    resolve: () => ({ label: 'Équipement', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/about$/,
    resolve: () => ({ label: 'À propos', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/memory$/,
    resolve: () => ({ label: 'Mémoire du coach', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/privacy$/,
    resolve: () => ({ label: 'Confidentialité', defaultParent: MOI_PARENT }),
  },
  {
    pattern: /^\/settings\/pro$/,
    resolve: () => ({ label: 'Pro', defaultParent: MOI_PARENT }),
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
    if (m) {
      return { entry: resolve(m) };
    }
  }
  return null;
}

/** Human label for a pushed stack entry. */
export function resolveRouteLabel(href: string): string {
  return match(href)?.entry.label ?? 'Retour';
}

/** True for modal-like routes that must not accumulate on the nav stack. */
export function isTransientRoute(href: string): boolean {
  return match(href)?.entry.transient === true;
}

/** Where to send Back when the app stack is empty for this route. */
export function resolveRouteFallback(href: string): { href: string; label: string } {
  const entry = match(href)?.entry;
  return entry?.defaultParent ?? HOME_PARENT;
}
