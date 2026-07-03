import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DeltaBadge, type DeltaBadgeVariant } from './delta-badge';
import { Sparkline } from './sparkline';

export interface ScoreCardProps {
  href: string;
  label: string;
  score: number | null;
  delta: number | null;
  higherIsBetter?: boolean;
  trendLabel: string;
  trendArrow: string;
  trendClass: string;
  sparklineValues: (number | null)[];
  sparklineStroke: string;
  cardClass: string;
  subMetrics: { label: string; value: string }[];
  deltaVariant?: DeltaBadgeVariant;
  variant?: 'default' | 'mobile';
}

export function ScoreCard({
  href,
  label,
  score,
  delta,
  higherIsBetter = true,
  trendLabel,
  trendArrow,
  trendClass,
  sparklineValues,
  sparklineStroke,
  cardClass,
  subMetrics,
  deltaVariant = 'emerald',
  variant = 'default',
}: ScoreCardProps) {
  const isMobile = variant === 'mobile';

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex min-h-11 overflow-hidden rounded-2xl border transition-opacity hover:opacity-90 active:opacity-80',
        isMobile ? 'flex-row items-center gap-3 px-4 py-3' : 'flex-col',
        cardClass,
      )}
    >
      <div
        className={cn('flex flex-col', isMobile ? 'min-w-0 flex-1 gap-1' : 'gap-3 px-5 pt-6 pb-4')}
      >
        <p className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>

        <div className={cn('flex items-end gap-2', isMobile && 'items-center')}>
          <span
            className={cn(
              'leading-none font-bold tabular-nums',
              isMobile ? 'text-3xl' : 'text-5xl',
            )}
          >
            {score !== null ? score : '—'}%
          </span>
          <div className={cn('flex flex-col gap-1', isMobile ? '' : 'mb-1')}>
            <DeltaBadge delta={delta} higherIsBetter={higherIsBetter} variant={deltaVariant} />
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendClass)}>
              {trendLabel}
              <span className="text-[10px]" aria-hidden>
                {trendArrow}
              </span>
            </span>
          </div>
        </div>

        {!isMobile && subMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-current/10 pt-3">
            {subMetrics.map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{m.label}</p>
                <p className="text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn(isMobile ? 'w-24 shrink-0' : 'mt-auto px-1 pb-1')}>
        <Sparkline h={isMobile ? 32 : 36} stroke={sparklineStroke} values={sparklineValues} />
      </div>
    </Link>
  );
}
