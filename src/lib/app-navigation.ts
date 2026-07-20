import { Dumbbell, HeartPulse, MessagesSquare, Settings, Sun } from 'lucide-react';

/**
 * Primary nav uses canonical hrefs only (`/`, `/training`, `/biology`, `/coach`, `/settings`).
 * `match` may also accept legacy aliases (`/corps`, `/body`, `/seances`, `/calendar`, …)
 * so deep links and bookmarks keep highlighting — do not add new primary destinations
 * under those aliases; redirect or map them to the canonical path instead.
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
  label: 'Accueil',
  icon: Sun,
  match: (p) => p === '/' || p.startsWith('/today'),
};

export const trainingNavItem: AppNavItem = {
  href: '/training',
  label: 'Entraînement',
  icon: Dumbbell,
  match: (p) =>
    p.startsWith('/training') ||
    p.startsWith('/seances') ||
    p.startsWith('/calendar') ||
    p.startsWith('/planning'),
};

export const biologyNavItem: AppNavItem = {
  href: '/biology',
  label: 'Physiologie',
  icon: HeartPulse,
  match: (p) =>
    p.startsWith('/biology') ||
    p.startsWith('/corps') ||
    p.startsWith('/recovery') ||
    p.startsWith('/body') ||
    p.startsWith('/analytics'),
};

export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: MessagesSquare,
  match: (p) => p.startsWith('/coach'),
};

export const settingsNavItem: AppNavItem = {
  href: '/settings',
  label: 'Réglages',
  icon: Settings,
  match: (p) => p.startsWith('/settings') || p.startsWith('/profil') || p.startsWith('/goals'),
};

/** Destinations principales sidebar desktop (sans Réglages). */
export const sidebarPrimaryNavItems: AppNavItem[] = [
  todayNavItem,
  trainingNavItem,
  biologyNavItem,
  coachNavItem,
];

/** Navigation sidebar desktop (ordre complet, y compris Réglages). */
export const sidebarNavItems: AppNavItem[] = [...sidebarPrimaryNavItems, settingsNavItem];

/** Onglets bottom bar mobile. */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  trainingNavItem,
  biologyNavItem,
  coachNavItem,
  settingsNavItem,
];
