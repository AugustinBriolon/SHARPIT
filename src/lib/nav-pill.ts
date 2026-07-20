import { cn } from '@/lib/utils';

/** Pill / onglet actif — Lime Pulse (Seed punctuation), pas d'inversion noir. */
export const navPillActiveClass = 'border-transparent !bg-highlight text-highlight-foreground';

/** Pill / onglet inactif. */
export const navPillInactiveClass =
  'bg-analysis-surface-alt text-muted-foreground hover:bg-highlight/40 hover:text-foreground border-transparent';

export function navPillClass(active: boolean, className?: string) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors',
    active ? navPillActiveClass : navPillInactiveClass,
    className,
  );
}

/** Lien sidebar desktop — actif Lime (aligné bottom nav mobile), pas de liseré primary. */
export function navLinkClass(active: boolean, className?: string) {
  return cn(
    'group focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-analysis px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
    active
      ? 'bg-highlight text-highlight-foreground'
      : 'text-muted-foreground hover:bg-highlight/40 hover:text-foreground',
    className,
  );
}
