import { CalendarRange, CircleUser, Footprints, MessagesSquare, Sun } from 'lucide-react';

/**
 * Primary nav — four temporal destinations (auth shell only).
 *
 * Today · Plan · Activité · Moi. Coach is contextual, not a tab.
 * Legal / onboarding / future teaser stay outside `(app)` and never wrap the tab bar.
 *
 * One prefix per intention: `/plan/*` is future and organisation, `/activite/*`
 * is completed execution, `/moi/*` and `/settings/*` are the athlete model and
 * the app itself. No prefix is claimed by two tabs, so no predicate has to split
 * one between them — which the old shared training prefix did require.
 */

export type NavIcon = typeof Sun;

export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

/** True for the hub itself and any of its children. */
function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export const todayNavItem: AppNavItem = {
  href: '/',
  label: 'Résumé',
  icon: Sun,
  // Nutrition is a Today detail, not a destination — it lights this tab rather
  // than leaving the bar with nothing marked current.
  match: (p) => p === '/' || underPrefix(p, '/today') || underPrefix(p, '/nutrition'),
};

export const planNavItem: AppNavItem = {
  href: '/plan',
  label: 'Plan',
  icon: CalendarRange,
  match: (p) => underPrefix(p, '/plan'),
};

export const activityNavItem: AppNavItem = {
  href: '/activite',
  label: 'Activité',
  icon: Footprints,
  match: (p) => underPrefix(p, '/activite'),
};

/**
 * Kept for contextual Coach entry points and deep links — not a primary tab.
 * Surfaces that open Coach should use `coachDiscussHref` / existing CTAs.
 */
export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: MessagesSquare,
  match: (p) => underPrefix(p, '/coach'),
};

export const moiNavItem: AppNavItem = {
  href: '/moi',
  label: 'Moi',
  icon: CircleUser,
  match: (p) => underPrefix(p, '/moi') || underPrefix(p, '/settings'),
};

/** Onglets barre flottante — tous viewports (Coach hors barre). */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  planNavItem,
  coachNavItem,
  activityNavItem,
  moiNavItem,
];
