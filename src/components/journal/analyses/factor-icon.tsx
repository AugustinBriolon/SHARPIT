import { Sparkles } from 'lucide-react';
import { journalCategoryIcon } from '@/lib/health/journal-category-surface';
import { isCustomTrackableId, journalTrackableById } from '@/lib/health/journal-trackables';
import { cn } from '@/lib/utils';

/** Icon well tinted by the habit's category — never by the association's polarity. */
export function FactorIcon({ factorId }: { factorId: string }) {
  const trackable = journalTrackableById(factorId);
  const Icon = trackable?.icon ?? Sparkles;
  const iconTone = journalCategoryIcon(
    trackable?.category ?? (isCustomTrackableId(factorId) ? 'personnalise' : undefined),
  );

  return (
    <span
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-lg', iconTone)}
    >
      <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
    </span>
  );
}
