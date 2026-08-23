import { CalendarDays, CircleUser, MessagesSquare, Sun, TrendingUp } from 'lucide-react';

/**
 * Primary nav uses canonical hrefs only (`/`, `/training`, `/progress`, `/coach`, `/settings`).
 *
 * The five destinations are temporal, not domain-led (ADR-022). Stage 1 of that
 * migration renames them where they stand — the hrefs still point at the routes
 * that exist today, so `Ma semaine` is still served by the training thread.
 * `Progression` now has its own surface (stage 3).
 */

export type NavIcon = typeof Sun;

export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const todayNavItem: AppNavItem = {
  href: '/',
  label: 'Aujourd’hui',
  icon: Sun,
  // Nutrition is a Today detail, not a destination — it lights this tab rather
  // than leaving the bar with nothing marked current.
  match: (p) => p === '/' || p.startsWith('/today') || p.startsWith('/nutrition'),
};

export const weekNavItem: AppNavItem = {
  href: '/training',
  label: 'Ma semaine',
  icon: CalendarDays,
  match: (p) => p.startsWith('/training'),
};

export const progressNavItem: AppNavItem = {
  href: '/progress',
  label: 'Progression',
  icon: TrendingUp,
  // `/biology` still matches: it redirects here, and the tab should not go dark
  // for the frame the redirect takes.
  match: (p) => p.startsWith('/progress') || p.startsWith('/biology'),
};

export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: MessagesSquare,
  match: (p) => p.startsWith('/coach'),
};

export const profileNavItem: AppNavItem = {
  href: '/settings',
  label: 'Profil',
  icon: CircleUser,
  match: (p) => p.startsWith('/settings'),
};

/** Destinations principales sidebar desktop (sans Profil). */
export const sidebarPrimaryNavItems: AppNavItem[] = [
  todayNavItem,
  weekNavItem,
  progressNavItem,
  coachNavItem,
];

/** Navigation sidebar desktop (ordre complet, y compris Profil). */
export const sidebarNavItems: AppNavItem[] = [...sidebarPrimaryNavItems, profileNavItem];

/** Onglets bottom bar mobile. */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  weekNavItem,
  progressNavItem,
  coachNavItem,
  profileNavItem,
];
