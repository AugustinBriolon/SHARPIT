import { cn } from '@/lib/utils';

/** Pill / onglet actif — vert sauge rassurant (pas d'inversion noir). */
export const navPillActiveClass =
  'border-primary/20 !bg-primary/10 text-primary shadow-sm shadow-primary/8';

/** Pill / onglet inactif. */
export const navPillInactiveClass =
  'bg-card/60 text-muted-foreground hover:bg-primary/8 hover:text-primary border-transparent';

export function navPillClass(active: boolean, className?: string) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors',
    active ? navPillActiveClass : navPillInactiveClass,
    className,
  );
}

export function navLinkClass(active: boolean, className?: string) {
  return cn(
    'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
    active ? navPillActiveClass : navPillInactiveClass,
    className,
  );
}
