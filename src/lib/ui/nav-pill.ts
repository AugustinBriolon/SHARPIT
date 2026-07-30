import { cn } from '@/lib/utils';

/** Pill / onglet actif — Lime Pulse (Seed punctuation), pas d'inversion noir. */
export const navPillActiveClass = 'border-transparent !bg-highlight text-highlight-foreground';

/** Pill / onglet inactif — sans fond (bande ink direction), hover lavis lime. */
export const navPillInactiveClass =
  'bg-transparent text-muted-foreground hover:bg-highlight/40 hover:text-foreground border-transparent';

export function navPillClass(active: boolean, className?: string) {
  return cn(
    'pressable inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium lg:min-h-9 lg:px-3.5',
    active ? navPillActiveClass : navPillInactiveClass,
    className,
  );
}

/** Lien sidebar desktop — actif Lime (aligné bottom nav mobile), pas de liseré primary. */
export function navLinkClass(active: boolean, className?: string) {
  return cn(
    'group pressable focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-analysis px-3 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-hidden',
    active
      ? 'bg-highlight text-highlight-foreground'
      : 'text-muted-foreground hover:bg-highlight/40 hover:text-foreground',
    className,
  );
}
