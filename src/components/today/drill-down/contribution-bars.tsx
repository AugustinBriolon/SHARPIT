'use client';

import { cn } from '@/lib/utils';

/**
 * What holds the score down, seen rather than computed.
 *
 * Four scores printed side by side make the athlete rank them in his head every
 * time. On a shared axis, sorted, the weakest contributor is the first thing the
 * eye lands on — which is the only reason to open this section at all.
 */
export type ContributionItem = {
  key: string;
  label: string;
  /** 0–100. Null when the dimension has no data today. */
  score: number | null;
  /** What the dimension actually measures — one short clause, not a sentence. */
  hint?: string | null;
};

export function ContributionBars({
  items,
  limiterKey = null,
}: {
  items: ContributionItem[];
  /**
   * Dimension to emphasise. Omitted, the lowest scorer is marked — which is what
   * "what holds the score down" means, without matching verdict prose to labels.
   */
  limiterKey?: string | null;
}) {
  const ranked = [...items].sort((a, b) => {
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return a.score - b.score;
  });

  const weakest = ranked.find((item) => item.score != null)?.key ?? null;

  return (
    <ul className="space-y-2.5">
      {ranked.map((item) => {
        const isLimiter = item.key === (limiterKey ?? weakest);
        const width = item.score != null ? Math.max(2, Math.min(100, item.score)) : 0;

        return (
          <li key={item.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  'min-w-0 truncate text-sm',
                  isLimiter ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {item.label}
                {isLimiter ? (
                  <span className="text-label text-signal-caution ml-2">frein</span>
                ) : null}
              </span>
              <span
                className={cn(
                  'text-data shrink-0 text-sm tabular-nums',
                  isLimiter ? 'text-signal-caution' : 'text-foreground/85',
                )}
              >
                {item.score != null ? Math.round(item.score) : '—'}
              </span>
            </div>

            <div className="bg-muted-foreground/10 h-1.5 w-full overflow-hidden rounded-full">
              <div
                style={{ width: `${width}%` }}
                className={cn(
                  'h-full rounded-full',
                  isLimiter ? 'bg-signal-caution' : 'bg-foreground/45',
                )}
                aria-hidden
              />
            </div>

            {item.hint ? (
              <p className="text-muted-foreground/70 text-xs leading-snug">{item.hint}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
