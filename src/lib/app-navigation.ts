import { Dumbbell, HeartPulse, Settings, Sparkles, Sun } from 'lucide-react';

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
    p.startsWith('/analytics') ||
    p.startsWith('/today/sleep') ||
    p.startsWith('/today/recovery') ||
    p.startsWith('/today/effort') ||
    p.startsWith('/today/adaptation'),
};

export const coachNavItem: AppNavItem = {
  href: '/coach',
  label: 'Coach',
  icon: Sparkles,
  match: (p) => p.startsWith('/coach'),
};

export const settingsNavItem: AppNavItem = {
  href: '/settings',
  label: 'Réglages',
  icon: Settings,
  match: (p) => p.startsWith('/settings') || p.startsWith('/profil') || p.startsWith('/goals'),
};

/** Navigation sidebar desktop (ordre complet). */
export const sidebarNavItems: AppNavItem[] = [
  todayNavItem,
  trainingNavItem,
  biologyNavItem,
  coachNavItem,
  settingsNavItem,
];

/** Onglets bottom bar mobile. */
export const bottomNavItems: AppNavItem[] = [
  todayNavItem,
  trainingNavItem,
  biologyNavItem,
  coachNavItem,
  settingsNavItem,
];
