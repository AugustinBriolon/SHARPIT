import { cn } from '@/lib/utils';

/**
 * Mobile chrome shared by every header button that floats over content — the
 * back arrow, and an actions trigger wherever a page has one (e.g. activity
 * detail). Desktop falls back to `lg:static` inline layout; each caller
 * layers its own desktop skin on top (label + gap for a back link, ghost
 * hover for an actions button) since only the floating mobile affordance
 * needs to be identical everywhere.
 *
 * `rounded-full` is a deliberate exception to DESIGN_LANGUAGE.md's
 * instrument `rounded-lg` button rule — this is floating nav chrome, not a
 * CTA, and every button sharing a header row must read as one circular
 * family: same 40px size, same frosted-glass opacity, same top offset.
 */
export function floatingHeaderButtonClass(side: 'left' | 'right'): string {
  return cn(
    'bg-background/70 text-foreground/70 hover:text-foreground hover:bg-background/85 fixed top-3 z-40 flex size-10 items-center justify-center rounded-full backdrop-blur-xl transition-colors lg:static lg:size-auto lg:rounded-none lg:bg-transparent lg:backdrop-blur-none lg:hover:bg-transparent',
    side === 'left' ? 'left-4' : 'right-4',
  );
}
