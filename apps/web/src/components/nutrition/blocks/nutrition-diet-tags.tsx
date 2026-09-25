import Link from 'next/link';
import { DietChipList } from '@/components/nutrition/diet-chip-list';
import { DIET_PREFERENCES_HREF } from '@/lib/nutrition/analysis/nutrition-reading-display';

/** Declared diet under the hero — edited where it lives, in the journal preferences. */
export function NutritionDietTags({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-label text-muted-foreground">Régime</span>
      <DietChipList labels={labels} />
      <Link
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-sm text-xs underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        href={DIET_PREFERENCES_HREF}
      >
        Modifier
      </Link>
    </div>
  );
}
