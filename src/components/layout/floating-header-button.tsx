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
 * family: same 48px size, same top offset. Mobile fill/blur is owned by
 * `ChromeGlass` (liquid-glass) when the caller wraps the control; this class
 * keeps layout + contrast tokens for the interactive hit target.
 *
 * Icon color dims to `/70` at rest on light canvas, but stays full-strength
 * `text-foreground` (Snow White) in dark mode — at 70% it read as a dull
 * gray against the dark, blurred backdrop instead of a clean white.
 */
export function floatingHeaderButtonClass(side: 'left' | 'right'): string {
  return cn(
    'text-foreground/70 hover:text-foreground dark:text-foreground fixed top-3 z-50 flex size-12 items-center justify-center rounded-full transition-colors lg:static lg:z-auto lg:size-auto lg:rounded-none lg:bg-transparent lg:hover:bg-transparent',
    side === 'left' ? 'left-4' : 'right-4',
  );
}

/** Frosted fill for floating header buttons when liquid-glass is not wrapping them. */
export function floatingHeaderButtonSurfaceClass(): string {
  return 'bg-background/70 hover:bg-background/85 backdrop-blur-xl';
}
