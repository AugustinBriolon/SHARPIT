import { cn } from '@/lib/utils';

export type DeltaBadgeVariant = 'amber' | 'emerald' | 'blue';

const VARIANT_RING: Record<DeltaBadgeVariant, string> = {
  amber: 'ring-amber-300/70 dark:ring-amber-700/50',
  emerald: 'ring-emerald-300/70 dark:ring-emerald-700/50',
  blue: 'ring-blue-300/70 dark:ring-blue-700/50',
};

export function DeltaBadge({
  delta,
  higherIsBetter = true,
  variant = 'emerald',
}: {
  delta: number | null;
  higherIsBetter?: boolean;
  variant?: DeltaBadgeVariant;
}) {
  if (delta === null || delta === 0) return null;
  const good = higherIsBetter ? delta > 0 : delta < 0;

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm ring-1',
        'bg-white/90 backdrop-blur-sm dark:bg-slate-950/75',
        VARIANT_RING[variant],
        good ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
      )}
    >
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}
