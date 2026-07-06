import {
  CalendarRange,
  Menu,
  PersonStanding,
  Settings,
  Sparkles,
  Sun,
  Target,
  User,
} from 'lucide-react';

export type NavIcon = typeof Sun;

export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const todayNavItem: AppNavItem = {
  href: '/',
  label: "Aujourd'hui",
  icon: Sun,
  match: (p) => p === '/' || p.startsWith('/today'),
};

export const sessionsNavItem: AppNavItem = {
  href: '/seances',
  label: 'Séances',
  icon: CalendarRange,
  match: (p) =>
    p.startsWith('/seances') ||
    p.startsWith('/training') ||
    p.startsWith('/calendar') ||
    p.startsWith('/planning'),
};

export const corpsNavItem: AppNavItem = {
  href: '/corps',
  label: 'Mon corps',
  icon: PersonStanding,
  match: (p) =>
    p.startsWith('/corps') ||
    p.startsWith('/recovery') ||
    p.startsWith('/body') ||
    p.startsWith('/analytics'),
};

export const goalsNavItem: AppNavItem = {
  href: '/goals',
  label: 'Objectifs',
  icon: Target,
  match: (p) => p.startsWith('/goals'),
};

export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: Sparkles,
  match: (p) => p.startsWith('/coach'),
};

export const profileNavItem: AppNavItem = {
  href: '/profil',
  label: 'Profil',
  icon: User,
  match: (p) => p.startsWith('/profil'),
};

export const settingsNavItem: AppNavItem = {
  href: '/settings',
  label: 'Réglages',
  icon: Settings,
  match: (p) => p.startsWith('/settings'),
};

/** Navigation sidebar desktop (ordre complet). */
export const sidebarNavItems: AppNavItem[] = [
  todayNavItem,
  sessionsNavItem,
  corpsNavItem,
  goalsNavItem,
  coachNavItem,
];

/** Onglets bottom bar mobile (4 + Plus). */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  sessionsNavItem,
  { ...corpsNavItem, label: 'Corps' },
  coachNavItem,
];

export const moreNavItems: AppNavItem[] = [goalsNavItem, profileNavItem, settingsNavItem];

export const moreNavTrigger: AppNavItem = {
  href: '#more',
  label: 'Plus',
  icon: Menu,
  match: (p) => moreNavItems.some((item) => item.match(p)),
};

export function isMoreNavActive(pathname: string): boolean {
  return moreNavItems.some((item) => item.match(pathname));
}
