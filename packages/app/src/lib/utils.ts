import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Typography utilities (`text-verdict`, `text-page-title`, …) share the `text-*`
 * prefix with color utilities. Without this, twMerge treats them as text-color
 * and drops them when `text-foreground` / `text-muted-foreground` is also present
 * (e.g. Today hero h1 → only `text-foreground` left in the DOM).
 */
const twMerge = extendTailwindMerge<'sharpit-type'>({
  extend: {
    classGroups: {
      'sharpit-type': [
        {
          text: [
            'label',
            'data',
            'instrument',
            'verdict',
            'page-title',
            'section-title',
            'card-title',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
