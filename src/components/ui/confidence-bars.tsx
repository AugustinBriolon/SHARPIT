import { cn } from '@/lib/utils';

/** DESIGN_LANGUAGE §11.4 — three stacked bars; filled = tier, empty = opacity-20. */
export function ConfidenceBars({
  filled,
  className,
  tone = 'primary',
}: {
  /** 0–3 filled bars */
  filled: number;
  className?: string;
  /** `highlight` = Lime Pulse bars for the ink band plate. */
  tone?: 'primary' | 'highlight';
}) {
  const count = Math.max(0, Math.min(3, Math.round(filled)));
  // Ink band inverts to Lime in dark — bars flip to Forest to stay visible.
  const barColorClass =
    tone === 'highlight' ? 'bg-highlight dark:bg-ink-surface-foreground' : 'bg-primary';

  return (
    <div
      className={cn('flex items-end gap-0.5', className)}
      title={`Confiance ${count}/3`}
      aria-hidden
    >
      {[1, 2, 3].map((level) => {
        let heightClass = 'h-2.5';
        if (level === 1) heightClass = 'h-1.5';
        else if (level === 2) heightClass = 'h-2';
        return (
          <span
            key={level}
            className={cn(
              'w-1.5 rounded-full',
              heightClass,
              barColorClass,
              level <= count ? 'opacity-90' : 'opacity-25',
            )}
          />
        );
      })}
    </div>
  );
}

export function confidenceBarsFromPct(pct: number | null | undefined): number {
  if (pct == null || !Number.isFinite(pct)) return 0;
  if (pct >= 67) return 3;
  if (pct >= 34) return 2;
  if (pct > 0) return 1;
  return 0;
}
