import { cn } from '@/lib/utils';

/**
 * Marks a day that carries data. Decorative — the owning control states it in its
 * accessible name, and the calendar legend pairs the dot with its meaning.
 * An empty day keeps the slot so numbers stay aligned across the row.
 */
export function DataDayDot({ visible, inverse }: { visible: boolean; inverse: boolean }) {
  const fill = inverse ? 'bg-highlight' : 'bg-primary';
  return (
    <span
      className={cn('block size-1.5 shrink-0 rounded-full', visible ? fill : 'bg-transparent')}
      aria-hidden
    />
  );
}
