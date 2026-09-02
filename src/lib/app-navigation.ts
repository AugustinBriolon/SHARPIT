import { CalendarRange, CircleUser, Footprints, MessagesSquare, Sun } from 'lucide-react';

/**
 * Shell V1 primary nav — four temporal destinations (auth shell only).
 *
 * Today · Plan · Activité · Moi. Coach is contextual, not a tab.
 * Legal / onboarding / future teaser stay outside `(app)` and never wrap the tab bar.
 *
 * Canonical hub hrefs: `/`, `/plan`, `/activite`, `/moi`. Existing deep routes
 * (`/training/*`, `/progress`, `/settings/*`, `/coach`) remain valid and light
 * the matching tab where applicable.
 */

export type NavIcon = typeof Sun;

export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

/** Week thread / planning hubs under `/training`. */
export function isPlanTrainingPath(pathname: string): boolean {
  if (pathname === '/training') {
    return true;
  }
  return (
    pathname.startsWith('/training/planning') ||
    pathname.startsWith('/training/weekly-review') ||
    pathname.startsWith('/training/sessions') ||
    pathname.startsWith('/training/progression')
  );
}

/** Activity-history and completed-session paths under `/training`. */
export function isActivityTrainingPath(pathname: string): boolean {
  return pathname.startsWith('/training') && !isPlanTrainingPath(pathname);
}

export const todayNavItem: AppNavItem = {
  href: '/',
  label: 'Today',
  icon: Sun,
  // Nutrition is a Today detail, not a destination — it lights this tab rather
  // than leaving the bar with nothing marked current.
  match: (p) => p === '/' || p.startsWith('/today') || p.startsWith('/nutrition'),
};

export const planNavItem: AppNavItem = {
  href: '/plan',
  label: 'Plan',
  icon: CalendarRange,
  match: (p) => p === '/plan' || p.startsWith('/plan/') || isPlanTrainingPath(p),
};

export const activityNavItem: AppNavItem = {
  href: '/activite',
  label: 'Activité',
  icon: Footprints,
  match: (p) => p === '/activite' || p.startsWith('/activite/') || isActivityTrainingPath(p),
};

/**
 * Kept for contextual Coach entry points and deep links — not a primary tab.
 * Surfaces that open Coach should use `coachDiscussHref` / existing CTAs.
 */
export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: MessagesSquare,
  match: (p) => p.startsWith('/coach'),
};

export const moiNavItem: AppNavItem = {
  href: '/moi',
  label: 'Moi',
  icon: CircleUser,
  match: (p) =>
    p === '/moi' ||
    p.startsWith('/moi/') ||
    p.startsWith('/settings') ||
    p.startsWith('/progress') ||
    p.startsWith('/biology'),
};

/** @deprecated Use `moiNavItem` — alias kept for callers that still say "profile". */
export const profileNavItem = moiNavItem;

/** Destinations principales sidebar desktop (sans Moi — identité en bas). */
export const sidebarPrimaryNavItems: AppNavItem[] = [
  todayNavItem,
  planNavItem,
  activityNavItem,
];

/** Navigation sidebar desktop (ordre complet, y compris Moi). */
export const sidebarNavItems: AppNavItem[] = [...sidebarPrimaryNavItems, moiNavItem];

/** Onglets bottom bar mobile — Shell V1 (Coach hors barre). */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  planNavItem,
  activityNavItem,
  moiNavItem,
];
