import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Domain-first why — global training decision demoted to expand.
 * Same DNA as SleepWhyBlock / TodayWhyBlock.
 */
export function PhysioDomainWhy({
  label,
  primary,
  primaryClassName,
  supportingLines = [],
  loading = false,
}: {
  label: string;
  primary: string | null;
  primaryClassName?: string;
  supportingLines?: string[];
  loading?: boolean;
}) {
  const hasSupport = !loading && supportingLines.length > 0;

  if (!loading && !primary && !hasSupport) return null;

  let primaryBlock: ReactNode = null;
  if (loading) {
    primaryBlock = (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-xl rounded-full" />
      </div>
    );
  } else if (primary) {
    primaryBlock = (
      <p className={cn('text-sm leading-relaxed', primaryClassName ?? 'text-foreground')}>
        {primary}
      </p>
    );
  }

  let supportBlock: ReactNode = null;
  if (hasSupport) {
    supportBlock = (
      <details className={cn('group', primary ? 'mt-2' : undefined)}>
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
          <span className="underline-offset-2 group-open:no-underline">
            {supportingLines.length === 1
              ? 'Voir le détail'
              : `Voir ${supportingLines.length} autres points`}
          </span>
        </summary>
        <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
          {supportingLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    );
  } else if (loading) {
    supportBlock = (
      <p className="text-muted-foreground mt-2 text-xs font-medium tracking-wide opacity-60">
        Voir le détail
      </p>
    );
  }

  return (
    <section aria-busy={loading || undefined} className="px-0.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-label">{label}</p>
      </div>

      {primaryBlock}
      {supportBlock}
    </section>
  );
}
