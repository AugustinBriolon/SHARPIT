import { JOURNAL_CATEGORY_ICON } from '@/lib/journal/journal-category-surface';
import { cn } from '@/lib/utils';

/** Declared diet chips — same look in the journal and on the nutrition page. */
export function DietChipList({ labels, className }: { labels: string[]; className?: string }) {
  if (labels.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Régime déclaré" className={cn('flex flex-wrap gap-1.5', className)}>
      {labels.map((label) => (
        <li
          key={label}
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-medium',
            JOURNAL_CATEGORY_ICON.nutrition,
          )}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
